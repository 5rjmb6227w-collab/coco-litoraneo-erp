import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";

// ============================================================================
// TIPOS
// ============================================================================
export type QRCodeType = "load" | "batch" | "product" | "equipment";

export interface QRCodeData {
  type: QRCodeType;
  entityId: number;
  code: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// GERAR CÓDIGO ÚNICO
// ============================================================================
function generateUniqueCode(type: QRCodeType, entityId: number): string {
  const prefix = {
    load: "CRG",
    batch: "LOT",
    product: "PRD",
    equipment: "EQP",
  }[type];
  
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${prefix}-${entityId}-${timestamp}-${random}`;
}

// ============================================================================
// CRIAR QR CODE
// ============================================================================
export async function createQRCode(
  type: QRCodeType,
  entityId: number,
  createdBy?: number,
  metadata?: Record<string, any>
): Promise<{ success: boolean; qrCode?: any; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };
  
  const code = generateUniqueCode(type, entityId);
  
  // Gerar dados para o QR Code (JSON)
  const qrData = {
    type,
    entityId,
    code,
    timestamp: Date.now(),
    ...metadata,
  };
  
  try {
    const [result] = await db.insert(schema.qrCodes).values({
      type,
      entityId,
      code,
      data: qrData,
      generatedBy: createdBy,
    }).$returningId();
    
    const qrCode = await db
      .select()
      .from(schema.qrCodes)
      .where(eq(schema.qrCodes.id, result.id))
      .limit(1);
    
    return { success: true, qrCode: qrCode[0] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// BUSCAR QR CODE POR CÓDIGO
// ============================================================================
export async function getQRCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(schema.qrCodes)
    .where(eq(schema.qrCodes.code, code))
    .limit(1);
  
  if (result.length === 0) return null;
  
  // Incrementar contador de scans
  await db
    .update(schema.qrCodes)
    .set({ 
      scannedCount: (result[0].scannedCount || 0) + 1,
      lastScannedAt: new Date(),
    })
    .where(eq(schema.qrCodes.id, result[0].id));
  
  return result[0];
}

// ============================================================================
// BUSCAR QR CODES POR ENTIDADE
// ============================================================================
export async function getQRCodesByEntity(type: QRCodeType, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(schema.qrCodes)
    .where(and(
      eq(schema.qrCodes.type, type),
      eq(schema.qrCodes.entityId, entityId)
    ));
}

// ============================================================================
// LISTAR TODOS OS QR CODES
// ============================================================================
export async function listQRCodes(filters?: {
  type?: QRCodeType;
  active?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(schema.qrCodes);
  
  // Por simplicidade, retornamos todos por enquanto
  return query.limit(filters?.limit || 100);
}

// ============================================================================
// DESATIVAR QR CODE
// ============================================================================
export async function deactivateQRCode(id: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };
  
  await db
    .update(schema.qrCodes)
    .set({ active: false })
    .where(eq(schema.qrCodes.id, id));
  
  return { success: true };
}

// ============================================================================
// MARCAR COMO IMPRESSO
// ============================================================================
export async function markAsPrinted(id: number, printedBy?: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) return { success: false };
  
  await db
    .update(schema.qrCodes)
    .set({ 
      printedAt: new Date(),
      printedBy,
    })
    .where(eq(schema.qrCodes.id, id));
  
  return { success: true };
}

// ============================================================================
// GERAR URL DE QR CODE (usando API externa)
// ============================================================================
export function getQRCodeImageUrl(data: string, size: number = 200): string {
  // Usar API do Google Charts para gerar QR Code
  const encodedData = encodeURIComponent(data);
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodedData}&choe=UTF-8`;
}

// ============================================================================
// GERAR URL COMPLETA DO QR CODE PARA SCAN
// ============================================================================
export function getQRCodeScanUrl(code: string): string {
  const baseUrl = process.env.VITE_APP_URL || "https://coco-litoraneo.com";
  return `${baseUrl}/qr/${code}`;
}
