/**
 * Módulo de Notificações por E-mail para o Copiloto IA
 * - Alertas críticos em tempo real
 * - Resumo diário
 * - Configuração de destinatários por role
 */

import { getDb } from "../db";
import { aiInsights, aiAlerts, aiConfig, users } from "../../drizzle/schema";
import { eq, and, gte, inArray } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ============================================
// TIPOS
// ============================================

export interface EmailRecipient {
  userId: number;
  name: string;
  email: string;
  role: string;
}

export interface AlertEmailData {
  type: "critical_alert" | "daily_summary" | "weekly_report";
  subject: string;
  recipients: EmailRecipient[];
  content: {
    title: string;
    summary: string;
    items: Array<{
      title: string;
      description: string;
      severity?: string;
      link?: string;
    }>;
    actionRequired?: boolean;
  };
}

export interface NotificationConfig {
  criticalAlertsEnabled: boolean;
  dailySummaryEnabled: boolean;
  dailySummaryTime: string; // "07:00"
  weeklyReportEnabled: boolean;
  weeklyReportDay: number; // 0-6 (domingo-sábado)
  recipientRoles: string[];
  recipientUserIds: number[];
}

// ============================================
// CONFIGURAÇÃO PADRÃO
// ============================================

const DEFAULT_CONFIG: NotificationConfig = {
  criticalAlertsEnabled: true,
  dailySummaryEnabled: true,
  dailySummaryTime: "07:00",
  weeklyReportEnabled: true,
  weeklyReportDay: 1, // Segunda-feira
  recipientRoles: ["admin", "ceo"],
  recipientUserIds: [],
};

// ============================================
// FUNÇÕES DE CONFIGURAÇÃO
// ============================================

/**
 * Obtém configuração de notificações
 */
export async function getNotificationConfig(): Promise<NotificationConfig> {
  try {
    const db = await getDb();
    if (!db) return DEFAULT_CONFIG;
    
    const [config] = await db.select()
      .from(aiConfig)
      .where(eq(aiConfig.configKey, "email_notifications"));
    
    if (config?.configValue) {
      const value = typeof config.configValue === "string" 
        ? config.configValue 
        : JSON.stringify(config.configValue);
      return { ...DEFAULT_CONFIG, ...JSON.parse(value) };
    }
    
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Salva configuração de notificações
 */
export async function saveNotificationConfig(config: Partial<NotificationConfig>): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    const currentConfig = await getNotificationConfig();
    const newConfig = { ...currentConfig, ...config };
    
    const [existing] = await db.select()
      .from(aiConfig)
      .where(eq(aiConfig.configKey, "email_notifications"));
    
    if (existing) {
      await db.update(aiConfig)
        .set({ configValue: JSON.stringify(newConfig), updatedAt: new Date() })
        .where(eq(aiConfig.configKey, "email_notifications"));
    } else {
      await db.insert(aiConfig).values({
        configKey: "email_notifications",
        configValue: JSON.stringify(newConfig),
      });
    }
    
    return true;
  } catch (error) {
    console.error("[Email Notifications] Erro ao salvar configuração:", error);
    return false;
  }
}

// ============================================
// FUNÇÕES DE DESTINATÁRIOS
// ============================================

/**
 * Obtém lista de destinatários baseado na configuração
 */
export async function getRecipients(): Promise<EmailRecipient[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    
    const config = await getNotificationConfig();
    
    // Buscar usuários por role ou ID específico
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    }).from(users);
    
    const recipients: EmailRecipient[] = [];
    
    for (const user of allUsers) {
      // Verificar se o usuário está na lista de IDs específicos
      if (config.recipientUserIds.includes(user.id)) {
        recipients.push({
          userId: user.id,
          name: user.name || "Usuário",
          email: user.email || "",
          role: user.role || "user",
        });
        continue;
      }
      
      // Verificar se o role do usuário está na lista de roles
      if (user.role && config.recipientRoles.includes(user.role)) {
        recipients.push({
          userId: user.id,
          name: user.name || "Usuário",
          email: user.email || "",
          role: user.role,
        });
      }
    }
    
    return recipients;
  } catch (error) {
    console.error("[Email Notifications] Erro ao buscar destinatários:", error);
    return [];
  }
}

// ============================================
// FUNÇÕES DE ENVIO
// ============================================

/**
 * Envia alerta crítico por e-mail
 */
export async function sendCriticalAlert(
  title: string,
  summary: string,
  details: Array<{ title: string; description: string; severity?: string }>
): Promise<boolean> {
  try {
    const config = await getNotificationConfig();
    
    if (!config.criticalAlertsEnabled) {
      console.log("[Email Notifications] Alertas críticos desabilitados");
      return false;
    }
    
    const recipients = await getRecipients();
    
    if (recipients.length === 0) {
      console.log("[Email Notifications] Nenhum destinatário configurado");
      return false;
    }
    
    // Formatar conteúdo do e-mail
    const content = `
🚨 **ALERTA CRÍTICO - Coco Litorâneo**

**${title}**

${summary}

---

**Detalhes:**

${details.map(d => `• **${d.title}** (${d.severity || "crítico"}): ${d.description}`).join("\n")}

---

*Este é um alerta automático do Copiloto IA. Acesse o sistema para mais detalhes.*
    `.trim();
    
    // Usar notifyOwner para enviar notificação
    const success = await notifyOwner({
      title: `🚨 ${title}`,
      content,
    });
    
    console.log(`[Email Notifications] Alerta crítico enviado: ${success ? "sucesso" : "falha"}`);
    return success;
  } catch (error) {
    console.error("[Email Notifications] Erro ao enviar alerta crítico:", error);
    return false;
  }
}

/**
 * Envia resumo diário por e-mail
 */
export async function sendDailySummary(): Promise<boolean> {
  try {
    const config = await getNotificationConfig();
    
    if (!config.dailySummaryEnabled) {
      console.log("[Email Notifications] Resumo diário desabilitado");
      return false;
    }
    
    const db = await getDb();
    if (!db) return false;
    
    // Buscar dados do dia
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Insights do dia
    const insightsToday = await db.select()
      .from(aiInsights)
      .where(gte(aiInsights.generatedAt, today));
    
    // Alertas críticos não lidos
    const criticalAlerts = await db.select()
      .from(aiAlerts)
      .where(and(
        eq(aiAlerts.status, "pending")
      ));
    
    // Formatar conteúdo
    const content = `
📊 **RESUMO DIÁRIO - Coco Litorâneo**

**Data:** ${today.toLocaleDateString("pt-BR")}

---

**📈 Insights Gerados Hoje:** ${insightsToday.length}

${insightsToday.length > 0 ? insightsToday.slice(0, 5).map(i => 
  `• **${i.title}** (${i.severity}): ${i.summary.substring(0, 100)}...`
).join("\n") : "Nenhum insight gerado hoje."}

---

**🚨 Alertas Críticos Pendentes:** ${criticalAlerts.length}

${criticalAlerts.length > 0 ? criticalAlerts.slice(0, 5).map(a => 
  `• **${a.title}**: ${a.message.substring(0, 100)}...`
).join("\n") : "Nenhum alerta crítico pendente."}

---

**Ações Recomendadas:**
${criticalAlerts.length > 0 ? "⚠️ Existem alertas críticos que requerem atenção imediata." : "✅ Nenhuma ação urgente necessária."}

---

*Este é um resumo automático do Copiloto IA. Acesse o sistema para mais detalhes.*
    `.trim();
    
    const success = await notifyOwner({
      title: `📊 Resumo Diário - ${today.toLocaleDateString("pt-BR")}`,
      content,
    });
    
    console.log(`[Email Notifications] Resumo diário enviado: ${success ? "sucesso" : "falha"}`);
    return success;
  } catch (error) {
    console.error("[Email Notifications] Erro ao enviar resumo diário:", error);
    return false;
  }
}

/**
 * Verifica e envia alertas críticos pendentes
 */
export async function checkAndSendCriticalAlerts(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;
    
    // Buscar alertas críticos não notificados
    const pendingAlerts = await db.select()
      .from(aiAlerts)
      .where(eq(aiAlerts.status, "pending"));
    
    if (pendingAlerts.length === 0) {
      return 0;
    }
    
    // Agrupar alertas por tipo
    const alertsByType: Record<string, typeof pendingAlerts> = {};
    for (const alert of pendingAlerts) {
      const type = alert.alertType || "general";
      if (!alertsByType[type]) {
        alertsByType[type] = [];
      }
      alertsByType[type].push(alert);
    }
    
    let sentCount = 0;
    
    for (const [type, alerts] of Object.entries(alertsByType)) {
      const success = await sendCriticalAlert(
        `${alerts.length} Alerta(s) Crítico(s) - ${type}`,
        `Foram detectados ${alerts.length} alerta(s) crítico(s) que requerem atenção imediata.`,
        alerts.map(a => ({
          title: a.title,
          description: a.message,
          severity: "critical",
        }))
      );
      
      if (success) {
        sentCount += alerts.length;
      }
    }
    
    return sentCount;
  } catch (error) {
    console.error("[Email Notifications] Erro ao verificar alertas críticos:", error);
    return 0;
  }
}

// ============================================
// FUNÇÕES DE AGENDAMENTO
// ============================================

/**
 * Verifica se é hora de enviar o resumo diário
 */
export function shouldSendDailySummary(config: NotificationConfig): boolean {
  if (!config.dailySummaryEnabled) return false;
  
  const now = new Date();
  const [hours, minutes] = config.dailySummaryTime.split(":").map(Number);
  
  return now.getHours() === hours && now.getMinutes() >= minutes && now.getMinutes() < minutes + 5;
}

/**
 * Verifica se é hora de enviar o relatório semanal
 */
export function shouldSendWeeklyReport(config: NotificationConfig): boolean {
  if (!config.weeklyReportEnabled) return false;
  
  const now = new Date();
  return now.getDay() === config.weeklyReportDay && now.getHours() === 8 && now.getMinutes() < 5;
}

// ============================================
// EXPORTS
// ============================================

export default {
  getNotificationConfig,
  saveNotificationConfig,
  getRecipients,
  sendCriticalAlert,
  sendDailySummary,
  checkAndSendCriticalAlerts,
  shouldSendDailySummary,
  shouldSendWeeklyReport,
};
