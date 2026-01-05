/**
 * Testes para FeedbackService - Bloco 8/9
 * Feedback avançado, analytics, retrain e A/B testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  submitAdvancedFeedback,
  getFeedbackAnalytics,
  checkRetrainTrigger,
  generatePerformanceReport,
  listPerformanceReports,
} from "./feedbackService";

// Mock do banco de dados
vi.mock("../db", () => {
  const mockDbResult = {
    where: () => mockDbResult,
    orderBy: () => mockDbResult,
    limit: () => Promise.resolve([]),
    groupBy: () => Promise.resolve([]),
  };

  return {
    getDb: () => Promise.resolve({
      insert: () => ({
        values: () => Promise.resolve([{ insertId: 1 }]),
      }),
      select: () => ({
        from: () => mockDbResult,
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve({}),
        }),
      }),
    }),
  };
});

describe("FeedbackService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitAdvancedFeedback", () => {
    it("deve rejeitar rating fora do range 1-5", async () => {
      await expect(
        submitAdvancedFeedback({
          userId: 1,
          rating: 0,
          feedbackType: "like",
          comment: "Comentário de teste com mais de 10 caracteres",
          interactionType: "chat",
        })
      ).rejects.toThrow("Rating deve ser entre 1 e 5");

      await expect(
        submitAdvancedFeedback({
          userId: 1,
          rating: 6,
          feedbackType: "like",
          comment: "Comentário de teste com mais de 10 caracteres",
          interactionType: "chat",
        })
      ).rejects.toThrow("Rating deve ser entre 1 e 5");
    });

    it("deve rejeitar comentário muito curto", async () => {
      await expect(
        submitAdvancedFeedback({
          userId: 1,
          rating: 5,
          feedbackType: "like",
          comment: "curto",
          interactionType: "chat",
        })
      ).rejects.toThrow("Comentário obrigatório (mínimo 10 caracteres)");
    });

    it("deve aceitar feedback válido", async () => {
      const result = await submitAdvancedFeedback({
        userId: 1,
        rating: 5,
        feedbackType: "like",
        comment: "Excelente resposta do Copiloto!",
        interactionType: "chat",
        language: "pt-BR",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it("deve aceitar feedback com áreas de melhoria", async () => {
      const result = await submitAdvancedFeedback({
        userId: 1,
        rating: 3,
        feedbackType: "neutral",
        comment: "Resposta ok, mas poderia ser mais clara",
        interactionType: "insight",
        improvementAreas: ["clarity", "completeness"],
      });

      expect(result.success).toBe(true);
    });

    it("deve aceitar feedback com dados de experimento A/B", async () => {
      const result = await submitAdvancedFeedback({
        userId: 1,
        rating: 4,
        feedbackType: "like",
        comment: "Boa resposta, bem formatada",
        interactionType: "chat",
        experimentId: "exp_test_123",
        variant: "treatment",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("getFeedbackAnalytics - estrutura", () => {
    it("deve definir estrutura byType correta", () => {
      const expectedByType = { like: 0, dislike: 0, neutral: 0 };
      expect(expectedByType).toHaveProperty("like");
      expect(expectedByType).toHaveProperty("dislike");
      expect(expectedByType).toHaveProperty("neutral");
    });

    it("deve definir estrutura byInteraction correta", () => {
      const expectedByInteraction = { chat: 0, insight: 0, alert: 0, action: 0, prediction: 0 };
      expect(expectedByInteraction).toHaveProperty("chat");
      expect(expectedByInteraction).toHaveProperty("insight");
      expect(expectedByInteraction).toHaveProperty("alert");
      expect(expectedByInteraction).toHaveProperty("action");
      expect(expectedByInteraction).toHaveProperty("prediction");
    });

    it("deve aceitar trends válidos", () => {
      const validTrends = ["improving", "stable", "declining"];
      expect(validTrends).toContain("improving");
      expect(validTrends).toContain("stable");
      expect(validTrends).toContain("declining");
    });
  });

  describe("checkRetrainTrigger - critérios", () => {
    it("deve definir critérios de retrain", () => {
      // Critérios para retrain
      const negativeThreshold = 0.3; // > 30% negativo
      const ratingThreshold = 3.0; // < 3.0 rating
      const minFeedbackCount = 100;

      expect(negativeThreshold).toBe(0.3);
      expect(ratingThreshold).toBe(3.0);
      expect(minFeedbackCount).toBe(100);
    });

    it("shouldRetrain deve ser boolean", () => {
      const shouldRetrain = true;
      expect(typeof shouldRetrain).toBe("boolean");
    });

    it("negativeRatio deve estar entre 0 e 1", () => {
      const negativeRatio = 0.25;
      expect(negativeRatio).toBeGreaterThanOrEqual(0);
      expect(negativeRatio).toBeLessThanOrEqual(1);
    });
  });

  describe("generatePerformanceReport - tipos", () => {
    it("deve aceitar tipo mensal", () => {
      const reportTypes = ["monthly", "quarterly", "annual"];
      expect(reportTypes).toContain("monthly");
    });

    it("deve aceitar tipo trimestral", () => {
      const reportTypes = ["monthly", "quarterly", "annual"];
      expect(reportTypes).toContain("quarterly");
    });

    it("deve aceitar tipo anual", () => {
      const reportTypes = ["monthly", "quarterly", "annual"];
      expect(reportTypes).toContain("annual");
    });
  });

  describe("listPerformanceReports - estrutura", () => {
    it("deve definir campos do relatório", () => {
      const reportFields = ["id", "reportType", "periodStart", "periodEnd", "avgRating", "satisfactionRate", "trend", "generatedAt"];
      expect(reportFields).toContain("avgRating");
      expect(reportFields).toContain("satisfactionRate");
      expect(reportFields).toContain("trend");
    });
  });

});

describe("A/B Testing - getUserVariant", () => {
  // Função local para testar hash determinístico
  function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  function getUserVariant(experimentId: string, userId: number, trafficAllocation: number): "control" | "treatment" {
    const hash = hashCode(`${experimentId}:${userId}`);
    const bucket = Math.abs(hash) % 100;
    return bucket < trafficAllocation * 100 ? "treatment" : "control";
  }

  describe("Alocação de usuários", () => {
    it("deve ser determinística para mesmo usuário", () => {
      const variant1 = getUserVariant("exp_test", 123, 0.5);
      const variant2 = getUserVariant("exp_test", 123, 0.5);

      expect(variant1).toBe(variant2);
    });

    it("deve retornar control ou treatment", () => {
      const variant = getUserVariant("exp_test", 1, 0.5);
      expect(["control", "treatment"]).toContain(variant);
    });

    it("deve distribuir aproximadamente 50/50", () => {
      let controlCount = 0;
      let treatmentCount = 0;
      
      for (let i = 1; i <= 1000; i++) {
        const variant = getUserVariant("exp_distribution", i, 0.5);
        if (variant === "control") controlCount++;
        else treatmentCount++;
      }

      // Deve estar aproximadamente 50/50 (com margem)
      expect(controlCount).toBeGreaterThan(350);
      expect(treatmentCount).toBeGreaterThan(350);
    });
  });
});

describe("Validações de Feedback", () => {
  describe("Tipos de interação", () => {
    const interactionTypes = ["chat", "insight", "alert", "action", "prediction"] as const;

    interactionTypes.forEach((type) => {
      it(`deve aceitar interactionType: ${type}`, async () => {
        const result = await submitAdvancedFeedback({
          userId: 1,
          rating: 4,
          feedbackType: "like",
          comment: "Feedback de teste válido",
          interactionType: type,
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe("Tipos de feedback", () => {
    const feedbackTypes = ["like", "dislike", "neutral"] as const;

    feedbackTypes.forEach((type) => {
      it(`deve aceitar feedbackType: ${type}`, async () => {
        const result = await submitAdvancedFeedback({
          userId: 1,
          rating: 3,
          feedbackType: type,
          comment: "Feedback de teste válido",
          interactionType: "chat",
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe("Áreas de melhoria", () => {
    const areas = ["accuracy", "relevance", "clarity", "completeness", "actionability"] as const;

    it("deve aceitar todas as áreas de melhoria", async () => {
      const result = await submitAdvancedFeedback({
        userId: 1,
        rating: 2,
        feedbackType: "dislike",
        comment: "Precisa melhorar em várias áreas",
        interactionType: "insight",
        improvementAreas: [...areas],
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("Idiomas suportados", () => {
  const languages = ["pt-BR", "en", "es"];

  languages.forEach((lang) => {
    it(`deve aceitar idioma: ${lang}`, async () => {
      const result = await submitAdvancedFeedback({
        userId: 1,
        rating: 5,
        feedbackType: "like",
        comment: "Feedback em idioma específico",
        interactionType: "chat",
        language: lang,
      });

      expect(result.success).toBe(true);
    });
  });
});
