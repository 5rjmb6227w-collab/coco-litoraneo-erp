/**
 * AI Event Emitter - Captura eventos do ERP e persiste na tabela ai_events
 * 
 * Este módulo é o "fio" que conecta todas as operações do ERP ao Copiloto IA.
 * Cada mutation relevante deve chamar emitEvent() para registrar a ação.
 */

import { getDb } from "../db";
import { aiEvents, InsertAIEvent } from "../../drizzle/schema";

// Tipos de eventos suportados por módulo
export const EVENT_TYPES = {
  // Recebimento
  COCONUT_LOAD_CREATED: "coconut_load.created",
  COCONUT_LOAD_UPDATED: "coconut_load.updated",
  COCONUT_LOAD_CLOSED: "coconut_load.closed",
  
  // Produtores
  PRODUCER_CREATED: "producer.created",
  PRODUCER_UPDATED: "producer.updated",
  PRODUCER_DEACTIVATED: "producer.deactivated",
  
  // Pagamentos
  PAYABLE_CREATED: "payable.created",
  PAYABLE_APPROVED: "payable.approved",
  PAYABLE_SCHEDULED: "payable.scheduled",
  PAYABLE_PAID: "payable.paid",
  
  // Produção
  PRODUCTION_ENTRY_CREATED: "production_entry.created",
  PRODUCTION_ENTRY_UPDATED: "production_entry.updated",
  PRODUCTION_ISSUE_CREATED: "production_issue.created",
  PRODUCTION_ISSUE_RESOLVED: "production_issue.resolved",
  
  // Almoxarifado
  WAREHOUSE_ITEM_CREATED: "warehouse_item.created",
  WAREHOUSE_MOVEMENT_CREATED: "warehouse_movement.created",
  WAREHOUSE_STOCK_LOW: "warehouse_stock.low",
  WAREHOUSE_STOCK_CRITICAL: "warehouse_stock.critical",
  
  // Estoque PA
  SKU_CREATED: "sku.created",
  FINISHED_GOODS_MOVEMENT: "finished_goods.movement",
  FINISHED_GOODS_EXPIRING: "finished_goods.expiring",
  
  // Compras
  PURCHASE_REQUEST_CREATED: "purchase_request.created",
  PURCHASE_REQUEST_APPROVED: "purchase_request.approved",
  PURCHASE_REQUEST_REJECTED: "purchase_request.rejected",
  PURCHASE_QUOTATION_CREATED: "purchase_quotation.created",
  PURCHASE_QUOTATION_SELECTED: "purchase_quotation.selected",
  
  // Financeiro
  FINANCIAL_ENTRY_CREATED: "financial_entry.created",
  FINANCIAL_ENTRY_PAID: "financial_entry.paid",
  FINANCIAL_ENTRY_OVERDUE: "financial_entry.overdue",
  
  // Qualidade
  QUALITY_ANALYSIS_CREATED: "quality_analysis.created",
  QUALITY_ANALYSIS_APPROVED: "quality_analysis.approved",
  QUALITY_ANALYSIS_REJECTED: "quality_analysis.rejected",
  NC_CREATED: "nc.created",
  NC_CLOSED: "nc.closed",
  
  // RH
  EMPLOYEE_CREATED: "employee.created",
  EMPLOYEE_UPDATED: "employee.updated",
  EMPLOYEE_EVENT_CREATED: "employee_event.created",
  
  // Usuários/Segurança
  USER_CREATED: "user.created",
  USER_LOGIN: "user.login",
  USER_LOGOUT: "user.logout",
  USER_BLOCKED: "user.blocked",
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Mapeamento de evento para módulo
const EVENT_MODULE_MAP: Record<string, string> = {
  "coconut_load": "recebimento",
  "producer": "produtores",
  "payable": "pagamentos",
  "production_entry": "producao",
  "production_issue": "producao",
  "warehouse": "almoxarifado",
  "sku": "estoque_pa",
  "finished_goods": "estoque_pa",
  "purchase": "compras",
  "financial": "financeiro",
  "quality": "qualidade",
  "nc": "qualidade",
  "employee": "rh",
  "user": "seguranca",
};

// Interface para dados do evento
export interface EventData {
  eventType: EventType;
  entityType: string;
  entityId: number;
  producerId?: number;
  skuId?: number;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  userId?: number;
}

/**
 * Emite um evento para o sistema de IA
 * Esta função deve ser chamada após cada mutation relevante
 */
export async function emitEvent(data: EventData): Promise<number | null> {
  try {
    // Determina o módulo baseado no tipo de entidade
    const entityPrefix = data.entityType.split("_")[0];
    const module = EVENT_MODULE_MAP[entityPrefix] || EVENT_MODULE_MAP[data.entityType] || "sistema";
    
    const eventRecord: InsertAIEvent = {
      eventType: data.eventType,
      module,
      entityType: data.entityType,
      entityId: data.entityId,
      producerId: data.producerId,
      skuId: data.skuId,
      payload: data.payload,
      metadata: data.metadata,
      createdBy: data.userId,
    };
    
    const db = await getDb();
    if (!db) return null;
    const result = await db.insert(aiEvents).values(eventRecord);
    return result[0].insertId;
  } catch (error) {
    console.error("[AI Event Emitter] Erro ao emitir evento:", error);
    // Não propaga o erro para não afetar a operação principal
    return null;
  }
}

/**
 * Emite múltiplos eventos em batch
 */
export async function emitEvents(events: EventData[]): Promise<void> {
  try {
    const records: InsertAIEvent[] = events.map(data => {
      const entityPrefix = data.entityType.split("_")[0];
      const module = EVENT_MODULE_MAP[entityPrefix] || EVENT_MODULE_MAP[data.entityType] || "sistema";
      
      return {
        eventType: data.eventType,
        module,
        entityType: data.entityType,
        entityId: data.entityId,
        producerId: data.producerId,
        skuId: data.skuId,
        payload: data.payload,
        metadata: data.metadata,
        createdBy: data.userId,
      };
    });
    
    if (records.length > 0) {
      const db = await getDb();
      if (!db) return;
      await db.insert(aiEvents).values(records);
    }
  } catch (error) {
    console.error("[AI Event Emitter] Erro ao emitir eventos em batch:", error);
  }
}

/**
 * Helper para criar payload de evento com campos relevantes
 */
export function createEventPayload<T extends Record<string, unknown>>(
  entity: T,
  fields: (keyof T)[]
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    if (entity[field] !== undefined) {
      payload[field as string] = entity[field];
    }
  }
  return payload;
}

/**
 * Helper para detectar estoque baixo/crítico
 */
export function checkStockLevel(
  currentStock: number,
  minimumStock: number
): "normal" | "low" | "critical" {
  if (currentStock <= 0) return "critical";
  if (currentStock <= minimumStock * 0.5) return "critical";
  if (currentStock <= minimumStock) return "low";
  return "normal";
}

/**
 * Helper para verificar produtos próximos do vencimento
 */
export function checkExpirationStatus(
  expirationDate: Date,
  daysThreshold: number = 30
): "ok" | "expiring_soon" | "expired" {
  const now = new Date();
  const diffDays = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return "expired";
  if (diffDays <= daysThreshold) return "expiring_soon";
  return "ok";
}
