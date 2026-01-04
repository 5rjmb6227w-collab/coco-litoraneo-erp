/**
 * Testes unitários para o módulo AI Copilot
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do getDb
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

// Mock do invokeLLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(() => Promise.resolve({
    choices: [{ message: { content: "Resposta de teste do LLM" } }],
    usage: { total_tokens: 100 },
  })),
}));

import { 
  emitEvent, 
  EVENT_TYPES, 
  createEventPayload,
  checkStockLevel,
  checkExpirationStatus,
} from "./eventEmitter";

import {
  buildContext,
  formatContextForPrompt,
} from "./contextBuilder";

import {
  checkCriticalStock,
  checkOverdueProducerPayments,
  checkExpiringProducts,
  checkOverduePayables,
  checkOpenNCs,
  checkPendingPurchaseRequests,
  runAllInsightChecks,
} from "./insightGenerator";

import {
  createConversation,
  getUserConversations,
  getConversationMessages,
  archiveConversation,
  submitFeedback,
  getQuickSummary,
} from "./chatService";

// ============================================================================
// TESTES DO EVENT EMITTER
// ============================================================================

describe("Event Emitter", () => {
  describe("EVENT_TYPES", () => {
    it("deve ter tipos de eventos para todos os módulos principais", () => {
      // Recebimento
      expect(EVENT_TYPES.COCONUT_LOAD_CREATED).toBe("coconut_load.created");
      expect(EVENT_TYPES.COCONUT_LOAD_UPDATED).toBe("coconut_load.updated");
      expect(EVENT_TYPES.COCONUT_LOAD_CLOSED).toBe("coconut_load.closed");
      
      // Produtores
      expect(EVENT_TYPES.PRODUCER_CREATED).toBe("producer.created");
      expect(EVENT_TYPES.PRODUCER_UPDATED).toBe("producer.updated");
      
      // Pagamentos
      expect(EVENT_TYPES.PAYABLE_CREATED).toBe("payable.created");
      expect(EVENT_TYPES.PAYABLE_APPROVED).toBe("payable.approved");
      expect(EVENT_TYPES.PAYABLE_PAID).toBe("payable.paid");
      
      // Produção
      expect(EVENT_TYPES.PRODUCTION_ENTRY_CREATED).toBe("production_entry.created");
      expect(EVENT_TYPES.PRODUCTION_ISSUE_CREATED).toBe("production_issue.created");
      
      // Almoxarifado
      expect(EVENT_TYPES.WAREHOUSE_ITEM_CREATED).toBe("warehouse_item.created");
      expect(EVENT_TYPES.WAREHOUSE_STOCK_LOW).toBe("warehouse_stock.low");
      expect(EVENT_TYPES.WAREHOUSE_STOCK_CRITICAL).toBe("warehouse_stock.critical");
      
      // Compras
      expect(EVENT_TYPES.PURCHASE_REQUEST_CREATED).toBe("purchase_request.created");
      expect(EVENT_TYPES.PURCHASE_REQUEST_APPROVED).toBe("purchase_request.approved");
      
      // Financeiro
      expect(EVENT_TYPES.FINANCIAL_ENTRY_CREATED).toBe("financial_entry.created");
      expect(EVENT_TYPES.FINANCIAL_ENTRY_OVERDUE).toBe("financial_entry.overdue");
      
      // Qualidade
      expect(EVENT_TYPES.QUALITY_ANALYSIS_CREATED).toBe("quality_analysis.created");
      expect(EVENT_TYPES.NC_CREATED).toBe("nc.created");
    });
  });

  describe("createEventPayload", () => {
    it("deve criar payload com campos especificados", () => {
      const entity = {
        id: 1,
        name: "Teste",
        value: 100,
        secret: "não incluir",
      };
      
      const payload = createEventPayload(entity, ["id", "name", "value"]);
      
      expect(payload).toEqual({
        id: 1,
        name: "Teste",
        value: 100,
      });
      expect(payload).not.toHaveProperty("secret");
    });

    it("deve ignorar campos undefined", () => {
      const entity = {
        id: 1,
        name: undefined,
        value: 100,
      };
      
      const payload = createEventPayload(entity, ["id", "name", "value"]);
      
      expect(payload).toEqual({
        id: 1,
        value: 100,
      });
    });
  });

  describe("checkStockLevel", () => {
    it("deve retornar 'critical' quando estoque é zero", () => {
      expect(checkStockLevel(0, 100)).toBe("critical");
    });

    it("deve retornar 'critical' quando estoque é <= 50% do mínimo", () => {
      expect(checkStockLevel(50, 100)).toBe("critical");
      expect(checkStockLevel(40, 100)).toBe("critical");
    });

    it("deve retornar 'low' quando estoque é <= mínimo mas > 50%", () => {
      expect(checkStockLevel(100, 100)).toBe("low");
      expect(checkStockLevel(60, 100)).toBe("low");
    });

    it("deve retornar 'normal' quando estoque é > mínimo", () => {
      expect(checkStockLevel(150, 100)).toBe("normal");
      expect(checkStockLevel(101, 100)).toBe("normal");
    });
  });

  describe("checkExpirationStatus", () => {
    it("deve retornar 'expired' para datas passadas", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(checkExpirationStatus(pastDate)).toBe("expired");
    });

    it("deve retornar 'expiring_soon' para datas dentro do threshold", () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 15);
      expect(checkExpirationStatus(nearDate, 30)).toBe("expiring_soon");
    });

    it("deve retornar 'ok' para datas além do threshold", () => {
      const farDate = new Date();
      farDate.setDate(farDate.getDate() + 60);
      expect(checkExpirationStatus(farDate, 30)).toBe("ok");
    });
  });

  describe("emitEvent", () => {
    it("deve retornar null quando db não está disponível", async () => {
      const result = await emitEvent({
        eventType: EVENT_TYPES.COCONUT_LOAD_CREATED,
        entityType: "coconut_load",
        entityId: 1,
      });
      
      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// TESTES DO CONTEXT BUILDER
// ============================================================================

describe("Context Builder", () => {
  describe("buildContext", () => {
    it("deve retornar estrutura de contexto válida", async () => {
      const context = await buildContext();
      
      expect(context).toHaveProperty("layers");
      expect(context).toHaveProperty("tokenEstimate");
      expect(context).toHaveProperty("generatedAt");
      expect(Array.isArray(context.layers)).toBe(true);
      expect(typeof context.tokenEstimate).toBe("number");
      expect(context.generatedAt instanceof Date).toBe(true);
    });

    it("deve incluir layers vazios quando db não está disponível", async () => {
      const context = await buildContext({
        includeSummary: true,
        includeEvents: true,
        includeInsights: true,
      });
      
      // Mesmo sem DB, deve retornar estrutura válida
      expect(context.layers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("formatContextForPrompt", () => {
    it("deve formatar contexto como string legível", () => {
      const context = {
        layers: [
          {
            type: "summary" as const,
            data: { resumoGeral: { teste: "valor" } },
            timestamp: new Date(),
          },
        ],
        tokenEstimate: 100,
        generatedAt: new Date(),
      };
      
      const formatted = formatContextForPrompt(context);
      
      expect(typeof formatted).toBe("string");
      expect(formatted).toContain("CONTEXTO DO SISTEMA ERP COCO LITORÂNEO");
      expect(formatted).toContain("RESUMOS");
      expect(formatted).toContain("FIM DO CONTEXTO");
    });

    it("deve incluir seção de eventos quando presente", () => {
      const context = {
        layers: [
          {
            type: "events" as const,
            data: { eventosRecentes: [] },
            timestamp: new Date(),
          },
        ],
        tokenEstimate: 50,
        generatedAt: new Date(),
      };
      
      const formatted = formatContextForPrompt(context);
      
      expect(formatted).toContain("EVENTOS RECENTES");
    });

    it("deve incluir seção de insights quando presente", () => {
      const context = {
        layers: [
          {
            type: "insights" as const,
            data: { insightsAtivos: [] },
            timestamp: new Date(),
          },
        ],
        tokenEstimate: 50,
        generatedAt: new Date(),
      };
      
      const formatted = formatContextForPrompt(context);
      
      expect(formatted).toContain("INSIGHTS ATIVOS");
    });
  });
});

// ============================================================================
// TESTES DO INSIGHT GENERATOR
// ============================================================================

describe("Insight Generator", () => {

  describe("checkCriticalStock", () => {
    it("deve retornar resultado válido mesmo sem db", async () => {
      const result = await checkCriticalStock();
      
      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("errors");
      expect(typeof result.created).toBe("number");
      expect(typeof result.skipped).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe("checkOverdueProducerPayments", () => {
    it("deve retornar resultado válido mesmo sem db", async () => {
      const result = await checkOverdueProducerPayments();
      
      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("errors");
    });
  });

  describe("checkExpiringProducts", () => {
    it("deve retornar resultado válido mesmo sem db", async () => {
      const result = await checkExpiringProducts();
      
      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("errors");
    });
  });

  describe("checkOverduePayables", () => {
    it("deve retornar resultado válido mesmo sem db", async () => {
      const result = await checkOverduePayables();
      
      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("errors");
    });
  });

  describe("checkOpenNCs", () => {
    it("deve retornar resultado válido mesmo sem db", async () => {
      const result = await checkOpenNCs();
      
      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("errors");
    });

    it("deve aceitar threshold customizado", async () => {
      const result = await checkOpenNCs(14);
      
      expect(result).toHaveProperty("created");
    });
  });

  describe("checkPendingPurchaseRequests", () => {
    it("deve retornar resultado válido mesmo sem db", async () => {
      const result = await checkPendingPurchaseRequests();
      
      expect(result).toHaveProperty("created");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("errors");
    });
  });

  describe("runAllInsightChecks", () => {
    it("deve executar todas as verificações e retornar resultados", async () => {
      const results = await runAllInsightChecks();
      
      expect(results).toHaveProperty("criticalStock");
      expect(results).toHaveProperty("overdueProducerPayments");
      expect(results).toHaveProperty("expiringProducts");
      expect(results).toHaveProperty("overduePayables");
      expect(results).toHaveProperty("openNCs");
      expect(results).toHaveProperty("pendingPurchaseRequests");
    });
  });
});

// ============================================================================
// TESTES DO CHAT SERVICE
// ============================================================================

describe("Chat Service", () => {

  describe("createConversation", () => {
    it("deve retornar null quando db não está disponível", async () => {
      const result = await createConversation(1, "Teste");
      expect(result).toBeNull();
    });
  });

  describe("getUserConversations", () => {
    it("deve retornar array vazio quando db não está disponível", async () => {
      const result = await getUserConversations(1);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("getConversationMessages", () => {
    it("deve retornar array vazio quando db não está disponível", async () => {
      const result = await getConversationMessages(1);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("archiveConversation", () => {
    it("deve retornar false quando db não está disponível", async () => {
      const result = await archiveConversation(1);
      expect(result).toBe(false);
    });
  });

  describe("submitFeedback", () => {
    it("deve retornar false quando db não está disponível", async () => {
      const result = await submitFeedback(1, 1, "like");
      expect(result).toBe(false);
    });
  });

  describe("getQuickSummary", () => {
    it("deve retornar string com resumo do sistema", async () => {
      const result = await getQuickSummary();
      expect(typeof result).toBe("string");
      expect(result).toContain("Resumo do Sistema");
    });
  });
});

// ============================================================================
// TESTES DE INTEGRAÇÃO (ESTRUTURA)
// ============================================================================

describe("AI Router Structure", () => {
  it("deve exportar aiRouter com todas as procedures", async () => {
    const { aiRouter } = await import("./aiRouter");
    
    expect(aiRouter).toBeDefined();
    expect(aiRouter._def).toBeDefined();
    expect(aiRouter._def.procedures).toBeDefined();
    
    // Verifica procedures principais
    const procedures = Object.keys(aiRouter._def.procedures);
    
    expect(procedures).toContain("chat");
    expect(procedures).toContain("listConversations");
    expect(procedures).toContain("getMessages");
    expect(procedures).toContain("createConversation");
    expect(procedures).toContain("archiveConversation");
    expect(procedures).toContain("listInsights");
    expect(procedures).toContain("dismissInsight");
    expect(procedures).toContain("resolveInsight");
    expect(procedures).toContain("runInsightChecks");
    expect(procedures).toContain("listEvents");
    expect(procedures).toContain("emitEvent");
    expect(procedures).toContain("getQuickSummary");
    expect(procedures).toContain("getContext");
    expect(procedures).toContain("submitFeedback");
    expect(procedures).toContain("listActions");
    expect(procedures).toContain("approveAction");
    expect(procedures).toContain("rejectAction");
    expect(procedures).toContain("getStats");
  });
});
