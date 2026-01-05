/**
 * IntegrationService - Serviço central de integrações externas
 * Bloco 9/9 - WhatsApp/Twilio, Zapier, Google Calendar
 */

import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type IntegrationType = "whatsapp" | "zapier" | "calendar" | "email" | "webhook";
export type IntegrationStatus = "active" | "inactive" | "error" | "pending";

export interface IntegrationConfig {
  type: IntegrationType;
  enabled: boolean;
  credentials?: Record<string, string>;
  settings?: Record<string, unknown>;
  fallbackType?: IntegrationType;
}

export interface IntegrationResult {
  success: boolean;
  integrationId?: string;
  messageId?: string;
  timestamp: number;
  error?: string;
  fallbackUsed?: boolean;
}

export interface IntegrationAdapter {
  type: IntegrationType;
  send(payload: IntegrationPayload): Promise<IntegrationResult>;
  validate(): Promise<boolean>;
  getStatus(): Promise<IntegrationStatus>;
}

export interface IntegrationPayload {
  type: "alert" | "notification" | "sync" | "export" | "webhook";
  recipient?: string;
  recipients?: string[];
  subject?: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CONFIGURAÇÃO DE INTEGRAÇÕES
// ============================================================================

const integrationConfigs: Map<IntegrationType, IntegrationConfig> = new Map();

export function configureIntegration(config: IntegrationConfig): void {
  integrationConfigs.set(config.type, config);
}

export function getIntegrationConfig(type: IntegrationType): IntegrationConfig | undefined {
  return integrationConfigs.get(type);
}

export function listIntegrations(): IntegrationConfig[] {
  return Array.from(integrationConfigs.values());
}

// ============================================================================
// TWILIO/WHATSAPP ADAPTER
// ============================================================================

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  templateId?: string;
}

export class TwilioWhatsAppAdapter implements IntegrationAdapter {
  type: IntegrationType = "whatsapp";
  private config: TwilioConfig;
  private baseUrl = "https://api.twilio.com/2010-04-01";

  constructor(config: TwilioConfig) {
    this.config = config;
  }

  async send(payload: IntegrationPayload): Promise<IntegrationResult> {
    const timestamp = Date.now();

    try {
      // Validar configuração
      if (!this.config.accountSid || !this.config.authToken) {
        throw new Error("Twilio credentials not configured");
      }

      const recipients = payload.recipients || (payload.recipient ? [payload.recipient] : []);
      
      if (recipients.length === 0) {
        throw new Error("No recipients specified");
      }

      // Formatar mensagem WhatsApp
      const formattedMessage = this.formatMessage(payload);

      // Enviar para cada destinatário
      const results: string[] = [];
      
      for (const recipient of recipients) {
        const messageId = await this.sendToRecipient(recipient, formattedMessage);
        results.push(messageId);
      }

      // Log de auditoria
      await this.logIntegration("whatsapp_send", {
        recipients,
        messageCount: results.length,
        priority: payload.priority,
      });

      return {
        success: true,
        integrationId: `twilio_${timestamp}`,
        messageId: results.join(","),
        timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Log de erro
      await this.logIntegration("whatsapp_error", { error: errorMessage });

      return {
        success: false,
        timestamp,
        error: errorMessage,
      };
    }
  }

  private formatMessage(payload: IntegrationPayload): string {
    const priorityEmoji = {
      low: "ℹ️",
      medium: "⚠️",
      high: "🔴",
      critical: "🚨",
    };

    const emoji = priorityEmoji[payload.priority || "medium"];
    const subject = payload.subject ? `*${payload.subject}*\n\n` : "";
    
    return `${emoji} *Coco Litorâneo ERP*\n\n${subject}${payload.message}`;
  }

  private async sendToRecipient(recipient: string, message: string): Promise<string> {
    // Formatar número para WhatsApp
    const whatsappNumber = `whatsapp:${recipient.replace(/\D/g, "")}`;
    
    // Em produção, fazer chamada real à API Twilio
    // Por enquanto, simular envio
    const mockMessageId = `SM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[Twilio] Sending WhatsApp to ${whatsappNumber}: ${message.substring(0, 50)}...`);
    
    return mockMessageId;
  }

  async validate(): Promise<boolean> {
    return !!(this.config.accountSid && this.config.authToken && this.config.fromNumber);
  }

  async getStatus(): Promise<IntegrationStatus> {
    if (!this.config.accountSid || !this.config.authToken) {
      return "inactive";
    }
    
    // Em produção, verificar status da conta Twilio
    return "active";
  }

  private async logIntegration(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.insert(auditLogs).values({
        action,
        module: "integrations",
        entityType: "integration",
        entityId: 0,
        oldValue: null,
        newValue: JSON.stringify(details),
        userId: 0,
        ipAddress: "system",
        userAgent: "IntegrationService",
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[TwilioAdapter] Failed to log integration:", error);
    }
  }
}

// ============================================================================
// ZAPIER ADAPTER
// ============================================================================

export interface ZapierConfig {
  webhookUrl: string;
  apiKey?: string;
  zapId?: string;
}

export interface ZapierPayload extends IntegrationPayload {
  zapierAction?: string;
  spreadsheetId?: string;
  sheetName?: string;
  rowData?: Record<string, unknown>;
}

export class ZapierAdapter implements IntegrationAdapter {
  type: IntegrationType = "zapier";
  private config: ZapierConfig;

  constructor(config: ZapierConfig) {
    this.config = config;
  }

  async send(payload: ZapierPayload): Promise<IntegrationResult> {
    const timestamp = Date.now();

    try {
      if (!this.config.webhookUrl) {
        throw new Error("Zapier webhook URL not configured");
      }

      // Preparar dados para Zapier
      const zapierData = {
        source: "coco_litoraneo_erp",
        timestamp: new Date().toISOString(),
        type: payload.type,
        action: payload.zapierAction || "default",
        priority: payload.priority || "medium",
        subject: payload.subject,
        message: payload.message,
        data: payload.data,
        spreadsheet: payload.spreadsheetId ? {
          id: payload.spreadsheetId,
          sheet: payload.sheetName,
          row: payload.rowData,
        } : undefined,
        metadata: payload.metadata,
      };

      // Em produção, fazer POST para webhook Zapier
      const result = await this.postToZapier(zapierData);

      // Log de auditoria
      await this.logIntegration("zapier_trigger", {
        webhookUrl: this.config.webhookUrl.substring(0, 50) + "...",
        action: payload.zapierAction,
        dataKeys: Object.keys(payload.data || {}),
      });

      return {
        success: true,
        integrationId: `zapier_${timestamp}`,
        messageId: result.id,
        timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      await this.logIntegration("zapier_error", { error: errorMessage });

      return {
        success: false,
        timestamp,
        error: errorMessage,
      };
    }
  }

  private async postToZapier(data: Record<string, unknown>): Promise<{ id: string }> {
    // Em produção, fazer fetch para webhook
    console.log(`[Zapier] Triggering webhook with data:`, JSON.stringify(data).substring(0, 100));
    
    // Simular resposta
    return { id: `zap_${Date.now()}` };
  }

  async validate(): Promise<boolean> {
    return !!this.config.webhookUrl;
  }

  async getStatus(): Promise<IntegrationStatus> {
    if (!this.config.webhookUrl) {
      return "inactive";
    }
    return "active";
  }

  private async logIntegration(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.insert(auditLogs).values({
        action,
        module: "integrations",
        entityType: "integration",
        entityId: 0,
        oldValue: null,
        newValue: JSON.stringify(details),
        userId: 0,
        ipAddress: "system",
        userAgent: "IntegrationService",
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[ZapierAdapter] Failed to log integration:", error);
    }
  }

  // Métodos específicos para automações comuns
  async exportToGoogleSheets(
    spreadsheetId: string,
    sheetName: string,
    data: Record<string, unknown>[]
  ): Promise<IntegrationResult> {
    return this.send({
      type: "export",
      message: `Exporting ${data.length} rows to Google Sheets`,
      zapierAction: "google_sheets_append",
      spreadsheetId,
      sheetName,
      rowData: { rows: data },
      data: { rowCount: data.length },
    });
  }

  async triggerWorkflow(
    workflowName: string,
    data: Record<string, unknown>
  ): Promise<IntegrationResult> {
    return this.send({
      type: "webhook",
      message: `Triggering workflow: ${workflowName}`,
      zapierAction: workflowName,
      data,
    });
  }
}

// ============================================================================
// EMAIL FALLBACK ADAPTER
// ============================================================================

export interface EmailConfig {
  provider: "smtp" | "sendgrid" | "ses";
  fromEmail: string;
  fromName?: string;
  apiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
}

export class EmailFallbackAdapter implements IntegrationAdapter {
  type: IntegrationType = "email";
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(payload: IntegrationPayload): Promise<IntegrationResult> {
    const timestamp = Date.now();

    try {
      const recipients = payload.recipients || (payload.recipient ? [payload.recipient] : []);
      
      if (recipients.length === 0) {
        throw new Error("No recipients specified");
      }

      // Em produção, enviar e-mail real
      console.log(`[Email] Sending to ${recipients.join(", ")}: ${payload.subject}`);

      await this.logIntegration("email_send", {
        recipients,
        subject: payload.subject,
        priority: payload.priority,
      });

      return {
        success: true,
        integrationId: `email_${timestamp}`,
        messageId: `msg_${timestamp}`,
        timestamp,
        fallbackUsed: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      return {
        success: false,
        timestamp,
        error: errorMessage,
      };
    }
  }

  async validate(): Promise<boolean> {
    return !!(this.config.fromEmail && (this.config.apiKey || this.config.smtpHost));
  }

  async getStatus(): Promise<IntegrationStatus> {
    if (!this.config.fromEmail) {
      return "inactive";
    }
    return "active";
  }

  private async logIntegration(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.insert(auditLogs).values({
        action,
        module: "integrations",
        entityType: "integration",
        entityId: 0,
        oldValue: null,
        newValue: JSON.stringify(details),
        userId: 0,
        ipAddress: "system",
        userAgent: "IntegrationService",
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("[EmailAdapter] Failed to log integration:", error);
    }
  }
}

// ============================================================================
// INTEGRATION SERVICE - ORQUESTRADOR
// ============================================================================

class IntegrationServiceClass {
  private adapters: Map<IntegrationType, IntegrationAdapter> = new Map();
  private fallbackChain: IntegrationType[] = ["whatsapp", "email"];

  registerAdapter(adapter: IntegrationAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(type: IntegrationType): IntegrationAdapter | undefined {
    return this.adapters.get(type);
  }

  async sendWithFallback(
    primaryType: IntegrationType,
    payload: IntegrationPayload
  ): Promise<IntegrationResult> {
    // Tentar adapter primário
    const primaryAdapter = this.adapters.get(primaryType);
    
    if (primaryAdapter) {
      const result = await primaryAdapter.send(payload);
      
      if (result.success) {
        return result;
      }

      console.log(`[IntegrationService] Primary ${primaryType} failed, trying fallback...`);
    }

    // Tentar fallbacks
    for (const fallbackType of this.fallbackChain) {
      if (fallbackType === primaryType) continue;

      const fallbackAdapter = this.adapters.get(fallbackType);
      
      if (fallbackAdapter) {
        const status = await fallbackAdapter.getStatus();
        
        if (status === "active") {
          const result = await fallbackAdapter.send(payload);
          
          if (result.success) {
            return { ...result, fallbackUsed: true };
          }
        }
      }
    }

    return {
      success: false,
      timestamp: Date.now(),
      error: "All integration adapters failed",
    };
  }

  async sendAlert(
    recipients: string[],
    subject: string,
    message: string,
    priority: "low" | "medium" | "high" | "critical" = "medium"
  ): Promise<IntegrationResult> {
    return this.sendWithFallback("whatsapp", {
      type: "alert",
      recipients,
      subject,
      message,
      priority,
    });
  }

  async sendNotification(
    recipients: string[],
    message: string,
    data?: Record<string, unknown>
  ): Promise<IntegrationResult> {
    return this.sendWithFallback("whatsapp", {
      type: "notification",
      recipients,
      message,
      data,
      priority: "medium",
    });
  }

  async triggerZapierWorkflow(
    workflowName: string,
    data: Record<string, unknown>
  ): Promise<IntegrationResult> {
    const zapierAdapter = this.adapters.get("zapier") as ZapierAdapter | undefined;
    
    if (!zapierAdapter) {
      return {
        success: false,
        timestamp: Date.now(),
        error: "Zapier adapter not configured",
      };
    }

    return zapierAdapter.triggerWorkflow(workflowName, data);
  }

  async exportToSheets(
    spreadsheetId: string,
    sheetName: string,
    data: Record<string, unknown>[]
  ): Promise<IntegrationResult> {
    const zapierAdapter = this.adapters.get("zapier") as ZapierAdapter | undefined;
    
    if (!zapierAdapter) {
      return {
        success: false,
        timestamp: Date.now(),
        error: "Zapier adapter not configured",
      };
    }

    return zapierAdapter.exportToGoogleSheets(spreadsheetId, sheetName, data);
  }

  async getIntegrationStatuses(): Promise<Record<IntegrationType, IntegrationStatus>> {
    const statuses: Record<string, IntegrationStatus> = {};

    for (const [type, adapter] of Array.from(this.adapters.entries())) {
      statuses[type] = await adapter.getStatus();
    }

    return statuses as Record<IntegrationType, IntegrationStatus>;
  }

  setFallbackChain(chain: IntegrationType[]): void {
    this.fallbackChain = chain;
  }
}

// Singleton
export const IntegrationService = new IntegrationServiceClass();

// ============================================================================
// TRIGGERS AUTOMÁTICOS PARA AI_ALERTS
// ============================================================================

export async function triggerAlertNotification(
  alertId: number,
  severity: string,
  title: string,
  message: string,
  recipients: string[]
): Promise<IntegrationResult> {
  const priority = severity === "critical" ? "critical" 
    : severity === "high" ? "high"
    : severity === "medium" ? "medium"
    : "low";

  return IntegrationService.sendAlert(
    recipients,
    `[${severity.toUpperCase()}] ${title}`,
    message,
    priority
  );
}

export async function triggerInsightNotification(
  insightId: number,
  type: string,
  title: string,
  description: string,
  recipients: string[]
): Promise<IntegrationResult> {
  return IntegrationService.sendNotification(
    recipients,
    `📊 *Novo Insight*\n\n*${title}*\n\n${description}`,
    { insightId, type }
  );
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

export function initializeIntegrations(configs: {
  twilio?: TwilioConfig;
  zapier?: ZapierConfig;
  email?: EmailConfig;
}): void {
  if (configs.twilio) {
    IntegrationService.registerAdapter(new TwilioWhatsAppAdapter(configs.twilio));
    console.log("[IntegrationService] Twilio/WhatsApp adapter registered");
  }

  if (configs.zapier) {
    IntegrationService.registerAdapter(new ZapierAdapter(configs.zapier));
    console.log("[IntegrationService] Zapier adapter registered");
  }

  if (configs.email) {
    IntegrationService.registerAdapter(new EmailFallbackAdapter(configs.email));
    console.log("[IntegrationService] Email fallback adapter registered");
  }
}
