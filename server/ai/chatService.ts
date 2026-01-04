/**
 * AI Chat Service - Serviço de chat com LLM para o Copiloto IA
 * 
 * Este módulo gerencia:
 * - Conversas e mensagens
 * - Integração com LLM (via invokeLLM)
 * - Contexto RAG para respostas informadas
 */

import { getDb } from "../db";
import { 
  aiConversations,
  aiMessages,
  aiFeedback,
  InsertAIConversation,
  InsertAIMessage,
  InsertAIFeedback,
} from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { buildContext, formatContextForPrompt } from "./contextBuilder";
import { invokeLLM } from "../_core/llm";

// ============================================================================
// TIPOS
// ============================================================================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  message: string;
  conversationId: number;
  messageId: number;
  tokensUsed?: number;
  sourceIds?: number[];
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `Você é o Copiloto IA do sistema ERP Coco Litorâneo, uma empresa de processamento de coco.

CONTEXTO DO SISTEMA:
- Sistema ERP com módulos: Recebimento, Produtores, Pagamentos, Produção, Almoxarifado, Estoque PA, Compras, Financeiro, Qualidade, RH
- Usuários: CEO (admin master), gerentes de área, operadores
- Foco: simplicidade e agilidade (qualquer entrada em 30 segundos)

SUAS CAPACIDADES:
1. Responder perguntas sobre dados do sistema (cargas, pagamentos, estoque, produção, etc.)
2. Alertar sobre situações críticas (estoque baixo, pagamentos atrasados, vencimentos)
3. Sugerir ações baseadas em padrões identificados
4. Explicar como usar funcionalidades do sistema

REGRAS:
- Seja conciso e direto
- Use dados reais do contexto fornecido
- Quando não souber, diga claramente
- Sugira ações específicas quando apropriado
- Use formatação markdown para melhor legibilidade
- Valores monetários em R$ (BRL)
- Pesos em kg
- Datas no formato brasileiro (DD/MM/AAAA)

LIMITAÇÕES:
- Não execute ações diretamente (apenas sugira)
- Não invente dados que não estão no contexto
- Não acesse sistemas externos`;

// ============================================================================
// FUNÇÕES DE CONVERSA
// ============================================================================

/**
 * Cria uma nova conversa
 */
export async function createConversation(userId: number, title?: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(aiConversations).values({
      userId,
      title: title || "Nova conversa",
    });
    return result[0].insertId;
  } catch (error) {
    console.error("[Chat Service] Erro ao criar conversa:", error);
    return null;
  }
}

/**
 * Busca conversas de um usuário
 */
export async function getUserConversations(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conversations = await db
      .select()
      .from(aiConversations)
      .where(and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.status, "active")
      ))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(limit);

    return conversations;
  } catch (error) {
    console.error("[Chat Service] Erro ao buscar conversas:", error);
    return [];
  }
}

/**
 * Busca mensagens de uma conversa
 */
export async function getConversationMessages(conversationId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  try {
    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(limit);

    // Retorna em ordem cronológica
    return messages.reverse();
  } catch (error) {
    console.error("[Chat Service] Erro ao buscar mensagens:", error);
    return [];
  }
}

/**
 * Salva uma mensagem na conversa
 */
export async function saveMessage(
  conversationId: number,
  role: "user" | "assistant" | "system",
  content: string,
  tokensUsed?: number,
  sourceIds?: number[]
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(aiMessages).values({
      conversationId,
      role,
      content,
      tokensUsed,
      sourceIds,
    });

    // Atualiza timestamp da conversa
    await db
      .update(aiConversations)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId));

    return result[0].insertId;
  } catch (error) {
    console.error("[Chat Service] Erro ao salvar mensagem:", error);
    return null;
  }
}

/**
 * Arquiva uma conversa
 */
export async function archiveConversation(conversationId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(aiConversations)
      .set({ status: "archived" })
      .where(eq(aiConversations.id, conversationId));
    return true;
  } catch (error) {
    console.error("[Chat Service] Erro ao arquivar conversa:", error);
    return false;
  }
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE CHAT
// ============================================================================

/**
 * Processa uma mensagem do usuário e retorna resposta do LLM
 */
export async function chat(
  userId: number,
  userMessage: string,
  conversationId?: number
): Promise<ChatResponse | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Cria ou usa conversa existente
    let convId: number | undefined = conversationId;
    if (!convId) {
      const newConvId = await createConversation(userId, userMessage.substring(0, 50));
      if (!newConvId) return null;
      convId = newConvId;
    }

    // Salva mensagem do usuário
    const userMsgId = await saveMessage(convId, "user", userMessage);
    if (!userMsgId) return null;

    // Busca histórico recente da conversa
    const history = await getConversationMessages(convId, 10);

    // Constrói contexto RAG
    const context = await buildContext({
      includeSummary: true,
      includeProduction: true,
      includeFinancial: true,
      includeQuality: true,
      includeEvents: true,
      includeInsights: true,
      eventLimit: 20,
    });

    const contextText = formatContextForPrompt(context);

    // Monta mensagens para o LLM
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextText },
    ];

    // Adiciona histórico (exceto a mensagem atual)
    for (const msg of history.slice(0, -1)) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    // Adiciona mensagem atual
    messages.push({ role: "user", content: userMessage });

    // Chama o LLM
    const response = await invokeLLM({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const rawContent = response.choices[0]?.message?.content;
    const assistantMessage = typeof rawContent === 'string' ? rawContent : "Desculpe, não consegui processar sua mensagem.";
    const tokensUsed = response.usage?.total_tokens;

    // Salva resposta do assistente
    const assistantMsgId = await saveMessage(convId, "assistant", assistantMessage, tokensUsed);

    return {
      message: assistantMessage,
      conversationId: convId,
      messageId: assistantMsgId || 0,
      tokensUsed,
    };
  } catch (error) {
    console.error("[Chat Service] Erro no chat:", error);
    return null;
  }
}

// ============================================================================
// FUNÇÕES DE FEEDBACK
// ============================================================================

/**
 * Registra feedback do usuário sobre uma mensagem
 */
export async function submitFeedback(
  userId: number,
  messageId: number,
  feedbackType: "like" | "dislike",
  comment?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(aiFeedback).values({
      userId,
      messageId,
      feedbackType,
      comment,
    });
    return true;
  } catch (error) {
    console.error("[Chat Service] Erro ao registrar feedback:", error);
    return false;
  }
}

// ============================================================================
// FUNÇÕES DE QUICK ACTIONS
// ============================================================================

/**
 * Gera um resumo rápido do sistema
 */
export async function getQuickSummary(): Promise<string> {
  const context = await buildContext({
    includeSummary: true,
    includeEvents: false,
    includeInsights: true,
  });

  const summaryLayer = context.layers.find(l => l.type === "summary");
  const insightsLayer = context.layers.find(l => l.type === "insights");

  let summary = "## Resumo do Sistema\n\n";

  if (summaryLayer?.data?.resumoGeral) {
    const data = summaryLayer.data.resumoGeral as Record<string, unknown>;
    const recebimento = data.recebimento as Record<string, unknown> | undefined;
    const pagamentos = data.pagamentos as Record<string, unknown> | undefined;
    const almox = data.almoxarifado as Record<string, unknown> | undefined;

    if (recebimento) {
      summary += `**Recebimento:** ${recebimento.totalCargas} cargas, ${recebimento.pesoTotalKg} kg\n`;
    }
    if (pagamentos) {
      summary += `**Pagamentos Pendentes:** ${pagamentos.pendentes} (R$ ${Number(pagamentos.valorPendente).toFixed(2)})\n`;
    }
    if (almox) {
      summary += `**Itens com Estoque Baixo:** ${almox.itensEstoqueBaixo}\n`;
    }
  }

  if (insightsLayer?.data?.insightsAtivos) {
    const insights = insightsLayer.data.insightsAtivos as unknown[];
    if (insights.length > 0) {
      summary += `\n### Alertas Ativos: ${insights.length}\n`;
    }
  }

  return summary;
}
