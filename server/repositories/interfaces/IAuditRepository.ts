/**
 * Interface do Repository de Auditoria.
 * Segue o princípio SOLID de Dependency Inversion.
 */

import type { PaginationOptions, PaginatedResult } from './IProducerRepository';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject' | 'export' | 'import' | 'view';

export interface AuditLogFilters {
  search?: string;
  userId?: string;
  action?: AuditAction | 'all';
  entityType?: string;
  entityId?: number;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}

export interface CreateAuditLogDTO {
  userId?: string;
  userName?: string;
  action: AuditAction;
  entityType: string;
  entityId?: number;
  entityName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: number;
  userId: string | null;
  userName: string | null;
  action: AuditAction;
  entityType: string;
  entityId: number | null;
  entityName: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ==================== SESSÕES ====================

export interface SessionFilters {
  userId?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateSessionDTO {
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface Session {
  id: number;
  userId: string;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  createdAt: Date;
}

// ==================== ALERTAS DE SEGURANÇA ====================

export interface SecurityAlertFilters {
  search?: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | 'all';
  isResolved?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateSecurityAlertDTO {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  userId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSecurityAlertDTO {
  isResolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export interface SecurityAlert {
  id: number;
  type: string;
  severity: string;
  title: string;
  description: string;
  userId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: Date;
}

// ==================== MÉTRICAS ====================

export interface AuditSummary {
  totalLogs: number;
  uniqueUsers: number;
  actionsByType: Record<AuditAction, number>;
  topEntities: Array<{ entityType: string; count: number }>;
}

export interface SecuritySummary {
  totalAlerts: number;
  unresolvedAlerts: number;
  criticalAlerts: number;
  alertsBySeverity: Record<string, number>;
}

export interface IAuditRepository {
  // ==================== LOGS DE AUDITORIA ====================

  findAllLogs(
    filters: AuditLogFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<AuditLog>>;

  findLogById(id: number): Promise<AuditLog | null>;

  createLog(data: CreateAuditLogDTO): Promise<AuditLog>;

  getLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]>;

  getLogsByUser(userId: string, pagination: PaginationOptions): Promise<PaginatedResult<AuditLog>>;

  getRecentLogs(limit: number): Promise<AuditLog[]>;

  // ==================== SESSÕES ====================

  findAllSessions(
    filters: SessionFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<Session>>;

  findSessionById(id: number): Promise<Session | null>;

  createSession(data: CreateSessionDTO): Promise<Session>;

  updateSessionActivity(id: number): Promise<Session>;

  endSession(id: number): Promise<Session>;

  endAllUserSessions(userId: string): Promise<number>;

  getActiveSessions(): Promise<Session[]>;

  getActiveSessionsByUser(userId: string): Promise<Session[]>;

  cleanExpiredSessions(): Promise<number>;

  // ==================== ALERTAS DE SEGURANÇA ====================

  findAllAlerts(
    filters: SecurityAlertFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<SecurityAlert>>;

  findAlertById(id: number): Promise<SecurityAlert | null>;

  createAlert(data: CreateSecurityAlertDTO): Promise<SecurityAlert>;

  updateAlert(id: number, data: UpdateSecurityAlertDTO): Promise<SecurityAlert>;

  resolveAlert(id: number, resolvedBy: string, resolution: string): Promise<SecurityAlert>;

  getUnresolvedAlerts(): Promise<SecurityAlert[]>;

  getCriticalAlerts(): Promise<SecurityAlert[]>;

  // ==================== MÉTRICAS ====================

  getAuditSummary(startDate?: Date, endDate?: Date): Promise<AuditSummary>;

  getSecuritySummary(): Promise<SecuritySummary>;

  countLogsByAction(action: AuditAction, startDate?: Date, endDate?: Date): Promise<number>;

  countActiveUsers(minutes: number): Promise<number>;

  getLoginAttempts(userId: string, hours: number): Promise<number>;
}

export default IAuditRepository;
