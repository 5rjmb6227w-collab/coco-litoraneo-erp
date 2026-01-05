/**
 * CalendarService - Integração com Google Calendar
 * Bloco 9/9 - Sync de datas de vencimento com calendário
 */

import { getDb } from "../db";
import { auditLogs, producerPayables, financialEntries } from "../../drizzle/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface CalendarConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  calendarId?: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  location?: string;
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: "email" | "popup"; minutes: number }>;
  };
  metadata?: Record<string, unknown>;
}

export interface CalendarSyncResult {
  success: boolean;
  eventId?: string;
  action: "created" | "updated" | "deleted" | "skipped";
  error?: string;
}

export interface SyncConfig {
  enabled: boolean;
  calendarId: string;
  syncPayables: boolean;
  syncFinancialEntries: boolean;
  reminderDays: number[];
  colorMapping: {
    payable: string;
    receivable: string;
    expense: string;
    overdue: string;
  };
}

// ============================================================================
// GOOGLE CALENDAR ADAPTER
// ============================================================================

export class GoogleCalendarAdapter {
  private config: CalendarConfig;
  private accessToken?: string;
  private tokenExpiry?: number;
  private baseUrl = "https://www.googleapis.com/calendar/v3";

  constructor(config: CalendarConfig) {
    this.config = config;
  }

  async authenticate(): Promise<boolean> {
    if (!this.config.refreshToken) {
      console.log("[Calendar] No refresh token configured");
      return false;
    }

    try {
      // Em produção, trocar refresh token por access token
      // Por enquanto, simular autenticação
      this.accessToken = `mock_access_token_${Date.now()}`;
      this.tokenExpiry = Date.now() + 3600 * 1000;
      
      console.log("[Calendar] Authenticated successfully");
      return true;
    } catch (error) {
      console.error("[Calendar] Authentication failed:", error);
      return false;
    }
  }

  async createEvent(event: CalendarEvent): Promise<CalendarSyncResult> {
    try {
      if (!await this.ensureAuthenticated()) {
        return { success: false, action: "skipped", error: "Not authenticated" };
      }

      const calendarId = this.config.calendarId || "primary";
      
      // Formatar evento para API do Google
      const googleEvent = this.formatEventForGoogle(event);

      // Em produção, fazer POST para API
      console.log(`[Calendar] Creating event: ${event.summary}`);
      
      const mockEventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await this.logCalendarAction("create", mockEventId, { summary: event.summary, start: event.start });

      return {
        success: true,
        eventId: mockEventId,
        action: "created",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, action: "skipped", error: errorMessage };
    }
  }

  async updateEvent(eventId: string, event: CalendarEvent): Promise<CalendarSyncResult> {
    try {
      if (!await this.ensureAuthenticated()) {
        return { success: false, action: "skipped", error: "Not authenticated" };
      }

      console.log(`[Calendar] Updating event ${eventId}: ${event.summary}`);

      await this.logCalendarAction("update", eventId, { summary: event.summary, start: event.start });

      return {
        success: true,
        eventId,
        action: "updated",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, action: "skipped", error: errorMessage };
    }
  }

  async deleteEvent(eventId: string): Promise<CalendarSyncResult> {
    try {
      if (!await this.ensureAuthenticated()) {
        return { success: false, action: "skipped", error: "Not authenticated" };
      }

      console.log(`[Calendar] Deleting event ${eventId}`);

      await this.logCalendarAction("delete", eventId, {});

      return {
        success: true,
        eventId,
        action: "deleted",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, action: "skipped", error: errorMessage };
    }
  }

  async listEvents(
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      if (!await this.ensureAuthenticated()) {
        return [];
      }

      console.log(`[Calendar] Listing events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Em produção, fazer GET para API
      return [];
    } catch (error) {
      console.error("[Calendar] Failed to list events:", error);
      return [];
    }
  }

  private async ensureAuthenticated(): Promise<boolean> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return true;
    }
    return this.authenticate();
  }

  private formatEventForGoogle(event: CalendarEvent): Record<string, unknown> {
    const formatted: Record<string, unknown> = {
      summary: event.summary,
      description: event.description,
    };

    if (event.allDay) {
      formatted.start = { date: event.start.toISOString().split("T")[0] };
      formatted.end = { date: (event.end || event.start).toISOString().split("T")[0] };
    } else {
      formatted.start = { dateTime: event.start.toISOString() };
      formatted.end = { dateTime: (event.end || new Date(event.start.getTime() + 3600000)).toISOString() };
    }

    if (event.location) {
      formatted.location = event.location;
    }

    if (event.colorId) {
      formatted.colorId = event.colorId;
    }

    if (event.reminders) {
      formatted.reminders = event.reminders;
    }

    return formatted;
  }

  private async logCalendarAction(
    action: string,
    eventId: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.insert(auditLogs).values({
        action: `calendar_${action}`,
        module: "integrations",
        entityType: "calendar_event",
        entityId: 0,
        oldValue: null,
        newValue: JSON.stringify({ eventId, ...details }),
        userId: 0,
        ipAddress: "system",
        userAgent: "CalendarService",
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[Calendar] Failed to log action:", error);
    }
  }
}

// ============================================================================
// CALENDAR SYNC SERVICE
// ============================================================================

class CalendarSyncServiceClass {
  private adapter?: GoogleCalendarAdapter;
  private syncConfig: SyncConfig = {
    enabled: false,
    calendarId: "primary",
    syncPayables: true,
    syncFinancialEntries: true,
    reminderDays: [7, 3, 1],
    colorMapping: {
      payable: "11", // Vermelho
      receivable: "10", // Verde
      expense: "6", // Laranja
      overdue: "4", // Rosa
    },
  };

  // Mapeamento de IDs de eventos sincronizados
  private syncedEvents: Map<string, string> = new Map();

  configure(config: CalendarConfig, syncConfig?: Partial<SyncConfig>): void {
    this.adapter = new GoogleCalendarAdapter(config);
    
    if (syncConfig) {
      this.syncConfig = { ...this.syncConfig, ...syncConfig };
    }

    console.log("[CalendarSync] Configured with calendar:", this.syncConfig.calendarId);
  }

  async syncPayableDueDate(
    payableId: number,
    producerName: string,
    dueDate: Date,
    amount: number,
    status: string
  ): Promise<CalendarSyncResult> {
    if (!this.adapter || !this.syncConfig.enabled || !this.syncConfig.syncPayables) {
      return { success: false, action: "skipped", error: "Sync not enabled" };
    }

    const eventKey = `payable_${payableId}`;
    const existingEventId = this.syncedEvents.get(eventKey);

    // Determinar cor baseada no status
    const isOverdue = dueDate < new Date() && status !== "pago";
    const colorId = isOverdue ? this.syncConfig.colorMapping.overdue : this.syncConfig.colorMapping.payable;

    const event: CalendarEvent = {
      summary: `💰 Pagar: ${producerName}`,
      description: `Pagamento ao produtor ${producerName}\nValor: R$ ${amount.toFixed(2)}\nStatus: ${status}\nID: ${payableId}`,
      start: dueDate,
      allDay: true,
      colorId,
      reminders: {
        useDefault: false,
        overrides: this.syncConfig.reminderDays.map(days => ({
          method: "popup" as const,
          minutes: days * 24 * 60,
        })),
      },
      metadata: { payableId, type: "payable" },
    };

    let result: CalendarSyncResult;

    if (existingEventId) {
      result = await this.adapter.updateEvent(existingEventId, event);
    } else {
      result = await this.adapter.createEvent(event);
      if (result.success && result.eventId) {
        this.syncedEvents.set(eventKey, result.eventId);
      }
    }

    return result;
  }

  async syncFinancialEntryDueDate(
    entryId: number,
    description: string,
    dueDate: Date,
    amount: number,
    type: "receita" | "despesa",
    status: string
  ): Promise<CalendarSyncResult> {
    if (!this.adapter || !this.syncConfig.enabled || !this.syncConfig.syncFinancialEntries) {
      return { success: false, action: "skipped", error: "Sync not enabled" };
    }

    const eventKey = `financial_${entryId}`;
    const existingEventId = this.syncedEvents.get(eventKey);

    const isOverdue = dueDate < new Date() && status !== "pago" && status !== "recebido";
    const baseColor = type === "receita" 
      ? this.syncConfig.colorMapping.receivable 
      : this.syncConfig.colorMapping.expense;
    const colorId = isOverdue ? this.syncConfig.colorMapping.overdue : baseColor;

    const emoji = type === "receita" ? "📈" : "📉";
    const event: CalendarEvent = {
      summary: `${emoji} ${type === "receita" ? "Receber" : "Pagar"}: ${description}`,
      description: `${type === "receita" ? "Conta a receber" : "Conta a pagar"}\nDescrição: ${description}\nValor: R$ ${amount.toFixed(2)}\nStatus: ${status}\nID: ${entryId}`,
      start: dueDate,
      allDay: true,
      colorId,
      reminders: {
        useDefault: false,
        overrides: this.syncConfig.reminderDays.map(days => ({
          method: "popup" as const,
          minutes: days * 24 * 60,
        })),
      },
      metadata: { entryId, type: "financial" },
    };

    let result: CalendarSyncResult;

    if (existingEventId) {
      result = await this.adapter.updateEvent(existingEventId, event);
    } else {
      result = await this.adapter.createEvent(event);
      if (result.success && result.eventId) {
        this.syncedEvents.set(eventKey, result.eventId);
      }
    }

    return result;
  }

  async removePayableFromCalendar(payableId: number): Promise<CalendarSyncResult> {
    if (!this.adapter) {
      return { success: false, action: "skipped", error: "Adapter not configured" };
    }

    const eventKey = `payable_${payableId}`;
    const eventId = this.syncedEvents.get(eventKey);

    if (!eventId) {
      return { success: false, action: "skipped", error: "Event not found" };
    }

    const result = await this.adapter.deleteEvent(eventId);
    
    if (result.success) {
      this.syncedEvents.delete(eventKey);
    }

    return result;
  }

  async removeFinancialEntryFromCalendar(entryId: number): Promise<CalendarSyncResult> {
    if (!this.adapter) {
      return { success: false, action: "skipped", error: "Adapter not configured" };
    }

    const eventKey = `financial_${entryId}`;
    const eventId = this.syncedEvents.get(eventKey);

    if (!eventId) {
      return { success: false, action: "skipped", error: "Event not found" };
    }

    const result = await this.adapter.deleteEvent(eventId);
    
    if (result.success) {
      this.syncedEvents.delete(eventKey);
    }

    return result;
  }

  async syncAllPendingPayables(): Promise<{
    total: number;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const db = await getDb();
    if (!db) {
      return { total: 0, synced: 0, failed: 0, errors: ["Database not available"] };
    }

    // Buscar payables pendentes
    const pendingPayables = await db
      .select()
      .from(producerPayables)
      .where(
        and(
          eq(producerPayables.status, "pendente"),
          gte(producerPayables.dueDate, new Date())
        )
      );

    const results = {
      total: pendingPayables.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const payable of pendingPayables) {
      const dueDate = payable.dueDate || new Date();
      const result = await this.syncPayableDueDate(
        payable.id,
        `Produtor #${payable.producerId}`,
        dueDate,
        Number(payable.totalValue),
        payable.status
      );

      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`Payable ${payable.id}: ${result.error}`);
        }
      }
    }

    return results;
  }

  async syncAllPendingFinancialEntries(): Promise<{
    total: number;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const db = await getDb();
    if (!db) {
      return { total: 0, synced: 0, failed: 0, errors: ["Database not available"] };
    }

    // Buscar entries pendentes
    const pendingEntries = await db
      .select()
      .from(financialEntries)
      .where(
        and(
          eq(financialEntries.status, "pendente"),
          gte(financialEntries.dueDate, new Date())
        )
      );

    const results = {
      total: pendingEntries.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const entry of pendingEntries) {
      const dueDate = entry.dueDate || new Date();
      const entryType = entry.entryType === "receber" ? "receita" : "despesa";
      const result = await this.syncFinancialEntryDueDate(
        entry.id,
        entry.description,
        dueDate,
        Number(entry.value),
        entryType,
        entry.status
      );

      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push(`Entry ${entry.id}: ${result.error}`);
        }
      }
    }

    return results;
  }

  getSyncConfig(): SyncConfig {
    return { ...this.syncConfig };
  }

  updateSyncConfig(config: Partial<SyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...config };
  }

  isEnabled(): boolean {
    return this.syncConfig.enabled && !!this.adapter;
  }
}

// Singleton
export const CalendarSyncService = new CalendarSyncServiceClass();

// ============================================================================
// TRIGGERS PARA SYNC AUTOMÁTICO
// ============================================================================

export async function triggerPayableSyncOnCreate(
  payableId: number,
  producerName: string,
  dueDate: Date,
  amount: number
): Promise<void> {
  if (CalendarSyncService.isEnabled()) {
    await CalendarSyncService.syncPayableDueDate(
      payableId,
      producerName,
      dueDate,
      amount,
      "pendente"
    );
  }
}

export async function triggerPayableSyncOnUpdate(
  payableId: number,
  producerName: string,
  dueDate: Date,
  amount: number,
  status: string
): Promise<void> {
  if (CalendarSyncService.isEnabled()) {
    if (status === "pago") {
      await CalendarSyncService.removePayableFromCalendar(payableId);
    } else {
      await CalendarSyncService.syncPayableDueDate(
        payableId,
        producerName,
        dueDate,
        amount,
        status
      );
    }
  }
}

export async function triggerFinancialEntrySyncOnCreate(
  entryId: number,
  description: string,
  dueDate: Date,
  amount: number,
  type: "receita" | "despesa"
): Promise<void> {
  if (CalendarSyncService.isEnabled()) {
    await CalendarSyncService.syncFinancialEntryDueDate(
      entryId,
      description,
      dueDate,
      amount,
      type,
      "pendente"
    );
  }
}

export async function triggerFinancialEntrySyncOnUpdate(
  entryId: number,
  description: string,
  dueDate: Date,
  amount: number,
  type: "receita" | "despesa",
  status: string
): Promise<void> {
  if (CalendarSyncService.isEnabled()) {
    if (status === "pago" || status === "recebido") {
      await CalendarSyncService.removeFinancialEntryFromCalendar(entryId);
    } else {
      await CalendarSyncService.syncFinancialEntryDueDate(
        entryId,
        description,
        dueDate,
        amount,
        type,
        status
      );
    }
  }
}
