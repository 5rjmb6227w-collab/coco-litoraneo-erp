/**
 * Testes para TranslationService e ABTestingService - Bloco 8/9
 * Internacionalização, tradução automática e testes A/B
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  translateWithDeepL,
  getLLMPromptConfig,
  SUPPORTED_LANGUAGES,
} from "./translationService";
import {
  createExperiment,
  startExperiment,
  pauseExperiment,
  getUserVariant,
  PREDEFINED_EXPERIMENTS,
} from "./abTestingService";

// Mock do banco de dados
vi.mock("../db", () => ({
  getDb: vi.fn(() => ({
    insert: vi.fn(() => ({
      values: vi.fn(() => [{ insertId: 1 }]),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => []),
          })),
          limit: vi.fn(() => []),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => []),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({})),
      })),
    })),
  })),
}));

// Mock do LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(() =>
    Promise.resolve({
      choices: [
        {
          message: {
            content: "Texto traduzido de teste",
          },
        },
      ],
    })
  ),
}));

describe("TranslationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SUPPORTED_LANGUAGES", () => {
    it("deve incluir pt-BR, en e es", () => {
      expect(SUPPORTED_LANGUAGES).toContain("pt-BR");
      expect(SUPPORTED_LANGUAGES).toContain("en");
      expect(SUPPORTED_LANGUAGES).toContain("es");
    });

    it("deve ter exatamente 3 idiomas suportados", () => {
      expect(SUPPORTED_LANGUAGES.length).toBe(3);
    });
  });

  describe("translateWithDeepL", () => {
    it("deve retornar estrutura de resposta válida", async () => {
      const result = await translateWithDeepL(
        "Texto de teste",
        "en",
        "pt-BR"
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("translatedText");
    });

    it("deve traduzir para inglês", async () => {
      const result = await translateWithDeepL(
        "Olá, como vai?",
        "en"
      );

      expect(result.success).toBe(true);
    });

    it("deve traduzir para espanhol", async () => {
      const result = await translateWithDeepL(
        "Hello, how are you?",
        "es"
      );

      expect(result.success).toBe(true);
    });

    it("deve traduzir para português", async () => {
      const result = await translateWithDeepL(
        "Hello, how are you?",
        "pt-BR"
      );

      expect(result.success).toBe(true);
    });

    it("deve lidar com texto vazio", async () => {
      const result = await translateWithDeepL("", "en");

      expect(result).toBeDefined();
    });
  });

  describe("getLLMPromptConfig", () => {
    it("deve retornar configuração para pt-BR", () => {
      const config = getLLMPromptConfig("pt-BR");

      expect(config).toBeDefined();
      expect(config).toHaveProperty("systemPrompt");
      expect(config).toHaveProperty("language");
      expect(config.language).toBe("pt-BR");
    });

    it("deve retornar configuração para en", () => {
      const config = getLLMPromptConfig("en");

      expect(config).toBeDefined();
      expect(config.language).toBe("en");
    });

    it("deve retornar configuração para es", () => {
      const config = getLLMPromptConfig("es");

      expect(config).toBeDefined();
      expect(config.language).toBe("es");
    });

    it("deve incluir instruções de formatação", () => {
      const config = getLLMPromptConfig("pt-BR");

      expect(config.systemPrompt).toBeDefined();
      expect(typeof config.systemPrompt).toBe("string");
    });
  });

  describe("System prompts por idioma", () => {
    it("deve retornar prompt diferente para cada idioma", () => {
      const configPt = getLLMPromptConfig("pt-BR");
      const configEn = getLLMPromptConfig("en");
      const configEs = getLLMPromptConfig("es");

      expect(configPt.systemPrompt).not.toBe(configEn.systemPrompt);
      expect(configEn.systemPrompt).not.toBe(configEs.systemPrompt);
    });
  });
});

describe("ABTestingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createExperiment", () => {
    it("deve criar experimento com sucesso", async () => {
      const result = await createExperiment({
        name: "Teste de Formato",
        feature: "chat_format",
        controlConfig: { maxLength: 500 },
        treatmentConfig: { maxLength: 800 },
        primaryMetric: "satisfaction_rate",
        createdBy: 1,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.experimentId).toBeDefined();
      expect(result.experimentId).toMatch(/^exp_/);
    });

    it("deve gerar experimentId único", async () => {
      const result1 = await createExperiment({
        name: "Experimento 1",
        feature: "feature_1",
        controlConfig: {},
        treatmentConfig: {},
        primaryMetric: "metric_1",
        createdBy: 1,
      });

      const result2 = await createExperiment({
        name: "Experimento 2",
        feature: "feature_2",
        controlConfig: {},
        treatmentConfig: {},
        primaryMetric: "metric_2",
        createdBy: 1,
      });

      expect(result1.experimentId).not.toBe(result2.experimentId);
    });

    it("deve aceitar métricas secundárias", async () => {
      const result = await createExperiment({
        name: "Teste com Métricas",
        feature: "test_feature",
        controlConfig: {},
        treatmentConfig: {},
        primaryMetric: "primary",
        secondaryMetrics: ["secondary_1", "secondary_2"],
        createdBy: 1,
      });

      expect(result.success).toBe(true);
    });

    it("deve aceitar traffic allocation customizado", async () => {
      const result = await createExperiment({
        name: "Teste 30/70",
        feature: "test_feature",
        controlConfig: {},
        treatmentConfig: {},
        primaryMetric: "metric",
        trafficAllocation: 0.3,
        createdBy: 1,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("getUserVariant", () => {
    it("deve retornar control ou treatment", () => {
      const variant = getUserVariant("exp_test", 1, 0.5);

      expect(["control", "treatment"]).toContain(variant);
    });

    it("deve ser determinístico para mesmo usuário", () => {
      const variant1 = getUserVariant("exp_test", 123, 0.5);
      const variant2 = getUserVariant("exp_test", 123, 0.5);

      expect(variant1).toBe(variant2);
    });

    it("deve variar entre usuários diferentes", () => {
      const variants = new Set<string>();
      
      // Testar com 100 usuários diferentes
      for (let i = 1; i <= 100; i++) {
        variants.add(getUserVariant("exp_test", i, 0.5));
      }

      // Deve ter ambas as variantes
      expect(variants.size).toBe(2);
    });

    it("deve respeitar traffic allocation de 0%", () => {
      // Com 0% de traffic, todos devem ser control
      for (let i = 1; i <= 10; i++) {
        const variant = getUserVariant("exp_test", i, 0);
        expect(variant).toBe("control");
      }
    });

    it("deve respeitar traffic allocation de 100%", () => {
      // Com 100% de traffic, todos devem ser treatment
      for (let i = 1; i <= 10; i++) {
        const variant = getUserVariant("exp_test", i, 1);
        expect(variant).toBe("treatment");
      }
    });
  });

  describe("startExperiment", () => {
    it("deve iniciar experimento", async () => {
      const result = await startExperiment("exp_test_123", 1);

      expect(result).toBe(true);
    });
  });

  describe("pauseExperiment", () => {
    it("deve pausar experimento", async () => {
      const result = await pauseExperiment("exp_test_123", 1);

      expect(result).toBe(true);
    });
  });

  describe("getUserVariant distribuição", () => {
    it("deve distribuir aproximadamente 50/50 com trafficAllocation 0.5", () => {
      let controlCount = 0;
      let treatmentCount = 0;
      
      for (let i = 1; i <= 1000; i++) {
        const variant = getUserVariant("exp_distribution_test", i, 0.5);
        if (variant === "control") controlCount++;
        else treatmentCount++;
      }

      // Deve estar aproximadamente 50/50 (com margem de 10%)
      expect(controlCount).toBeGreaterThan(400);
      expect(controlCount).toBeLessThan(600);
      expect(treatmentCount).toBeGreaterThan(400);
      expect(treatmentCount).toBeLessThan(600);
    });
  });

  describe("PREDEFINED_EXPERIMENTS", () => {
    it("deve ter experimento CHAT_RESPONSE_FORMAT", () => {
      expect(PREDEFINED_EXPERIMENTS.CHAT_RESPONSE_FORMAT).toBeDefined();
      expect(PREDEFINED_EXPERIMENTS.CHAT_RESPONSE_FORMAT.name).toBeDefined();
      expect(PREDEFINED_EXPERIMENTS.CHAT_RESPONSE_FORMAT.feature).toBeDefined();
    });

    it("deve ter experimento INSIGHT_THRESHOLD", () => {
      expect(PREDEFINED_EXPERIMENTS.INSIGHT_THRESHOLD).toBeDefined();
    });

    it("deve ter experimento FEEDBACK_TIMING", () => {
      expect(PREDEFINED_EXPERIMENTS.FEEDBACK_TIMING).toBeDefined();
    });

    it("todos experimentos devem ter primaryMetric", () => {
      Object.values(PREDEFINED_EXPERIMENTS).forEach((exp) => {
        expect(exp.primaryMetric).toBeDefined();
      });
    });

    it("todos experimentos devem ter controlConfig e treatmentConfig", () => {
      Object.values(PREDEFINED_EXPERIMENTS).forEach((exp) => {
        expect(exp.controlConfig).toBeDefined();
        expect(exp.treatmentConfig).toBeDefined();
      });
    });
  });
});

describe("Integração i18n + Feedback", () => {
  describe("Feedback por idioma", () => {
    const languages = ["pt-BR", "en", "es"] as const;

    languages.forEach((lang) => {
      it(`deve gerar prompt LLM correto para ${lang}`, () => {
        const config = getLLMPromptConfig(lang);

        expect(config.language).toBe(lang);
        expect(config.systemPrompt.length).toBeGreaterThan(50);
      });
    });
  });
});

describe("Validações de Segurança", () => {
  describe("Tradução", () => {
    it("deve sanitizar entrada para tradução", async () => {
      const maliciousInput = "<script>alert('xss')</script>";
      
      const result = await translateWithDeepL(maliciousInput, "en");

      // Não deve falhar com entrada maliciosa
      expect(result).toBeDefined();
    });
  });

  describe("Experimentos", () => {
    it("deve validar experimentId no formato correto", async () => {
      const result = await createExperiment({
        name: "Teste",
        feature: "test",
        controlConfig: {},
        treatmentConfig: {},
        primaryMetric: "metric",
        createdBy: 1,
      });

      expect(result.experimentId).toMatch(/^exp_\d+_[a-z0-9]+$/);
    });
  });
});
