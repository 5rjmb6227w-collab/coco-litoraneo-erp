import * as crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";

// ============================================================================
// CONSTANTES
// ============================================================================
const SALT_LENGTH = 32;
const HASH_ITERATIONS = 100000;
const HASH_KEY_LENGTH = 64;
const HASH_DIGEST = "sha512";
const SESSION_TOKEN_LENGTH = 64;
const RESET_TOKEN_LENGTH = 32;
const RESET_TOKEN_EXPIRY_HOURS = 24;
const SESSION_EXPIRY_HOURS = 24;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

// ============================================================================
// FUNÇÕES DE HASH DE SENHA
// ============================================================================
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString("hex");
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(
    password,
    salt,
    HASH_ITERATIONS,
    HASH_KEY_LENGTH,
    HASH_DIGEST
  ).toString("hex");
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computedHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(computedHash, "hex")
  );
}

export function generateToken(length: number = SESSION_TOKEN_LENGTH): string {
  return crypto.randomBytes(length).toString("hex");
}

// ============================================================================
// VALIDAÇÃO DE SENHA
// ============================================================================
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Senha deve ter no mínimo 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve conter pelo menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve conter pelo menos um número");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// CRIAR CREDENCIAIS DE USUÁRIO
// ============================================================================
export async function createUserCredentials(
  userId: number,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validatePassword(password);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(", ") };
  }
  
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  // Verificar se email já existe
  const existing = await db
    .select()
    .from(schema.userCredentials)
    .where(eq(schema.userCredentials.email, email.toLowerCase()))
    .limit(1);
  
  if (existing.length > 0) {
    return { success: false, error: "Email já cadastrado" };
  }
  
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  
  await db.insert(schema.userCredentials).values({
    userId,
    email: email.toLowerCase(),
    passwordHash,
    passwordSalt: salt,
    passwordHistory: JSON.stringify([passwordHash]),
  });
  
  return { success: true };
}

// ============================================================================
// LOGIN COM EMAIL/SENHA
// ============================================================================
export interface LoginResult {
  success: boolean;
  userId?: number;
  sessionToken?: string;
  requires2FA?: boolean;
  error?: string;
  lockedUntil?: Date;
}

export async function loginWithCredentials(
  email: string,
  password: string,
  deviceInfo?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  // Buscar credenciais
  const credentials = await db
    .select()
    .from(schema.userCredentials)
    .where(eq(schema.userCredentials.email, email.toLowerCase()))
    .limit(1);
  
  if (credentials.length === 0) {
    return { success: false, error: "Email ou senha inválidos" };
  }
  
  const cred = credentials[0];
  
  // Verificar se está bloqueado
  if (cred.lockedUntil && new Date(cred.lockedUntil) > new Date()) {
    return { 
      success: false, 
      error: "Conta bloqueada temporariamente",
      lockedUntil: new Date(cred.lockedUntil)
    };
  }
  
  // Verificar senha
  const passwordValid = verifyPassword(password, cred.passwordHash, cred.passwordSalt);
  
  if (!passwordValid) {
    // Incrementar tentativas falhas
    const newAttempts = (cred.failedLoginAttempts || 0) + 1;
    const updateData: any = { failedLoginAttempts: newAttempts };
    
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
      updateData.lockedUntil = lockUntil;
    }
    
    await db
      .update(schema.userCredentials)
      .set(updateData)
      .where(eq(schema.userCredentials.id, cred.id));
    
    return { success: false, error: "Email ou senha inválidos" };
  }
  
  // Resetar tentativas falhas
  await db
    .update(schema.userCredentials)
    .set({ failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(schema.userCredentials.id, cred.id));
  
  // Verificar se precisa de 2FA
  const twoFactor = await db
    .select()
    .from(schema.userTwoFactor)
    .where(and(
      eq(schema.userTwoFactor.userId, cred.userId),
      eq(schema.userTwoFactor.enabled, true)
    ))
    .limit(1);
  
  if (twoFactor.length > 0) {
    // Criar sessão temporária para 2FA
    const tempToken = generateToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 min para completar 2FA
    
    await db.insert(schema.userActiveSessions).values({
      userId: cred.userId,
      sessionToken: tempToken,
      deviceInfo,
      ipAddress,
      userAgent,
      expiresAt,
      isValid: false, // Não válida até completar 2FA
    });
    
    return { 
      success: true, 
      userId: cred.userId,
      sessionToken: tempToken,
      requires2FA: true 
    };
  }
  
  // Criar sessão completa
  const sessionToken = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);
  
  await db.insert(schema.userActiveSessions).values({
    userId: cred.userId,
    sessionToken,
    deviceInfo,
    ipAddress,
    userAgent,
    expiresAt,
    isValid: true,
  });
  
  // Atualizar lastSignedIn no usuário
  await db
    .update(schema.users)
    .set({ lastSignedIn: new Date() })
    .where(eq(schema.users.id, cred.userId));
  
  return { 
    success: true, 
    userId: cred.userId,
    sessionToken,
    requires2FA: false 
  };
}

// ============================================================================
// VERIFICAR 2FA
// ============================================================================
export async function verify2FA(
  sessionToken: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  // Buscar sessão temporária
  const sessions = await db
    .select()
    .from(schema.userActiveSessions)
    .where(and(
      eq(schema.userActiveSessions.sessionToken, sessionToken),
      eq(schema.userActiveSessions.isValid, false)
    ))
    .limit(1);
  
  if (sessions.length === 0) {
    return { success: false, error: "Sessão inválida ou expirada" };
  }
  
  const session = sessions[0];
  
  if (new Date(session.expiresAt) < new Date()) {
    return { success: false, error: "Sessão expirada" };
  }
  
  // Buscar configuração 2FA
  const twoFactor = await db
    .select()
    .from(schema.userTwoFactor)
    .where(eq(schema.userTwoFactor.userId, session.userId))
    .limit(1);
  
  if (twoFactor.length === 0) {
    return { success: false, error: "2FA não configurado" };
  }
  
  const tf = twoFactor[0];
  
  // Verificar código TOTP
  const validCode = verifyTOTP(tf.secret || "", code);
  
  if (!validCode) {
    // Verificar códigos de backup
    const backupCodes = (tf.backupCodes as string[]) || [];
    const codeIndex = backupCodes.indexOf(code);
    
    if (codeIndex === -1) {
      return { success: false, error: "Código inválido" };
    }
    
    // Remover código de backup usado
    backupCodes.splice(codeIndex, 1);
    await db
      .update(schema.userTwoFactor)
      .set({ backupCodes: JSON.stringify(backupCodes) })
      .where(eq(schema.userTwoFactor.id, tf.id));
  }
  
  // Validar sessão
  const newExpiresAt = new Date();
  newExpiresAt.setHours(newExpiresAt.getHours() + SESSION_EXPIRY_HOURS);
  
  await db
    .update(schema.userActiveSessions)
    .set({ isValid: true, expiresAt: newExpiresAt })
    .where(eq(schema.userActiveSessions.id, session.id));
  
  // Atualizar lastUsedAt do 2FA
  await db
    .update(schema.userTwoFactor)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.userTwoFactor.id, tf.id));
  
  return { success: true };
}

// ============================================================================
// TOTP (Time-based One-Time Password)
// ============================================================================
export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString("hex").toUpperCase().substring(0, 32);
}

export function verifyTOTP(secret: string, code: string): boolean {
  if (!secret || !code || code.length !== 6) return false;
  
  const time = Math.floor(Date.now() / 30000);
  
  // Verificar código atual e ±1 janela de tempo
  for (let i = -1; i <= 1; i++) {
    const expectedCode = generateTOTPCode(secret, time + i);
    if (expectedCode === code) return true;
  }
  
  return false;
}

function generateTOTPCode(secret: string, time: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(time));
  
  const hmac = crypto.createHmac("sha1", Buffer.from(secret, "hex"));
  hmac.update(buffer);
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, "0");
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
}

// ============================================================================
// SETUP 2FA
// ============================================================================
export async function setup2FA(userId: number): Promise<{
  success: boolean;
  secret?: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  // Verificar se já existe
  const existing = await db
    .select()
    .from(schema.userTwoFactor)
    .where(eq(schema.userTwoFactor.userId, userId))
    .limit(1);
  
  const secret = generateTOTPSecret();
  const backupCodes = generateBackupCodes();
  
  // Buscar email do usuário
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  
  const email = user[0]?.email || "usuario";
  const issuer = "CocoLitoraneoERP";
  const qrCodeUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
  
  if (existing.length > 0) {
    await db
      .update(schema.userTwoFactor)
      .set({
        secret,
        backupCodes: JSON.stringify(backupCodes),
        enabled: false,
        verifiedAt: null,
      })
      .where(eq(schema.userTwoFactor.userId, userId));
  } else {
    await db.insert(schema.userTwoFactor).values({
      userId,
      method: "totp",
      secret,
      backupCodes: JSON.stringify(backupCodes),
      enabled: false,
    });
  }
  
  return {
    success: true,
    secret,
    qrCodeUrl,
    backupCodes,
  };
}

// ============================================================================
// CONFIRMAR 2FA
// ============================================================================
export async function confirm2FA(
  userId: number,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const twoFactor = await db
    .select()
    .from(schema.userTwoFactor)
    .where(eq(schema.userTwoFactor.userId, userId))
    .limit(1);
  
  if (twoFactor.length === 0) {
    return { success: false, error: "2FA não configurado" };
  }
  
  const tf = twoFactor[0];
  
  if (!verifyTOTP(tf.secret || "", code)) {
    return { success: false, error: "Código inválido" };
  }
  
  await db
    .update(schema.userTwoFactor)
    .set({ enabled: true, verifiedAt: new Date() })
    .where(eq(schema.userTwoFactor.id, tf.id));
  
  return { success: true };
}

// ============================================================================
// RECUPERAÇÃO DE SENHA
// ============================================================================
export async function createPasswordResetToken(
  email: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const credentials = await db
    .select()
    .from(schema.userCredentials)
    .where(eq(schema.userCredentials.email, email.toLowerCase()))
    .limit(1);
  
  if (credentials.length === 0) {
    // Não revelar se email existe
    return { success: true };
  }
  
  const token = generateToken(RESET_TOKEN_LENGTH);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);
  
  await db.insert(schema.passwordResetTokens).values({
    userId: credentials[0].userId,
    token,
    expiresAt,
  });
  
  return { success: true, token };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(", ") };
  }
  
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const tokens = await db
    .select()
    .from(schema.passwordResetTokens)
    .where(eq(schema.passwordResetTokens.token, token))
    .limit(1);
  
  if (tokens.length === 0) {
    return { success: false, error: "Token inválido" };
  }
  
  const resetToken = tokens[0];
  
  if (resetToken.usedAt) {
    return { success: false, error: "Token já utilizado" };
  }
  
  if (new Date(resetToken.expiresAt) < new Date()) {
    return { success: false, error: "Token expirado" };
  }
  
  // Atualizar senha
  const salt = generateSalt();
  const passwordHash = hashPassword(newPassword, salt);
  
  await db
    .update(schema.userCredentials)
    .set({
      passwordHash,
      passwordSalt: salt,
      passwordChangedAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(schema.userCredentials.userId, resetToken.userId));
  
  // Marcar token como usado
  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.passwordResetTokens.id, resetToken.id));
  
  // Invalidar todas as sessões do usuário
  await db
    .update(schema.userActiveSessions)
    .set({ isValid: false })
    .where(eq(schema.userActiveSessions.userId, resetToken.userId));
  
  return { success: true };
}

// ============================================================================
// VALIDAR SESSÃO
// ============================================================================
export async function validateSession(
  sessionToken: string
): Promise<{ valid: boolean; userId?: number }> {
  const db = await getDb();
  if (!db) return { valid: false };
  
  const sessions = await db
    .select()
    .from(schema.userActiveSessions)
    .where(and(
      eq(schema.userActiveSessions.sessionToken, sessionToken),
      eq(schema.userActiveSessions.isValid, true)
    ))
    .limit(1);
  
  if (sessions.length === 0) {
    return { valid: false };
  }
  
  const session = sessions[0];
  
  if (new Date(session.expiresAt) < new Date()) {
    return { valid: false };
  }
  
  // Atualizar lastActivityAt
  await db
    .update(schema.userActiveSessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(schema.userActiveSessions.id, session.id));
  
  return { valid: true, userId: session.userId };
}

// ============================================================================
// LOGOUT
// ============================================================================
export async function logout(sessionToken: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(schema.userActiveSessions)
    .set({ isValid: false })
    .where(eq(schema.userActiveSessions.sessionToken, sessionToken));
}

// ============================================================================
// ALTERAR SENHA
// ============================================================================
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(", ") };
  }
  
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const credentials = await db
    .select()
    .from(schema.userCredentials)
    .where(eq(schema.userCredentials.userId, userId))
    .limit(1);
  
  if (credentials.length === 0) {
    return { success: false, error: "Usuário não encontrado" };
  }
  
  const cred = credentials[0];
  
  // Verificar senha atual
  if (!verifyPassword(currentPassword, cred.passwordHash, cred.passwordSalt)) {
    return { success: false, error: "Senha atual incorreta" };
  }
  
  // Verificar se nova senha não está no histórico
  const history = (cred.passwordHistory as string[]) || [];
  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);
  
  for (const oldHash of history.slice(-5)) {
    if (oldHash === newHash) {
      return { success: false, error: "Nova senha não pode ser igual às últimas 5 senhas" };
    }
  }
  
  // Atualizar senha
  history.push(newHash);
  
  await db
    .update(schema.userCredentials)
    .set({
      passwordHash: newHash,
      passwordSalt: newSalt,
      passwordChangedAt: new Date(),
      passwordHistory: JSON.stringify(history.slice(-5)),
      mustChangePassword: false,
    })
    .where(eq(schema.userCredentials.id, cred.id));
  
  return { success: true };
}

// ============================================================================
// BUSCAR USUÁRIO POR CREDENCIAIS
// ============================================================================
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  
  const credentials = await db
    .select()
    .from(schema.userCredentials)
    .where(eq(schema.userCredentials.email, email.toLowerCase()))
    .limit(1);
  
  if (credentials.length === 0) return null;
  
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, credentials[0].userId))
    .limit(1);
  
  return user[0] || null;
}

// ============================================================================
// LISTAR SESSÕES ATIVAS DO USUÁRIO
// ============================================================================
export async function getUserSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(schema.userActiveSessions)
    .where(and(
      eq(schema.userActiveSessions.userId, userId),
      eq(schema.userActiveSessions.isValid, true)
    ));
}

// ============================================================================
// INVALIDAR TODAS AS SESSÕES DO USUÁRIO
// ============================================================================
export async function invalidateAllSessions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(schema.userActiveSessions)
    .set({ isValid: false })
    .where(eq(schema.userActiveSessions.userId, userId));
}
