/**
 * TranslationService - Tradução automática e prompts LLM por idioma
 * Bloco 8/9 - Integração com DeepL API e adaptação de prompts
 */

import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type SupportedLanguage = "pt-BR" | "en" | "es";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["pt-BR", "en", "es"];

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  confidence?: number;
  provider?: "deepl" | "fallback" | "cache";
  error?: string;
}

export interface LLMPromptConfig {
  language: SupportedLanguage;
  systemPrompt: string;
  userGreeting: string;
  responseFormat: string;
  contextInstructions: string;
}

// ============================================================================
// CACHE DE TRADUÇÕES
// ============================================================================

const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

function getCacheKey(text: string, targetLang: string): string {
  return `${targetLang}:${text.substring(0, 100)}`;
}

function getFromCache(text: string, targetLang: string): string | null {
  const key = getCacheKey(text, targetLang);
  const cached = translationCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }
  
  return null;
}

function setCache(text: string, targetLang: string, translated: string): void {
  const key = getCacheKey(text, targetLang);
  translationCache.set(key, { text: translated, timestamp: Date.now() });
  
  // Limpar cache antigo se muito grande
  if (translationCache.size > 10000) {
    const now = Date.now();
    const entries = Array.from(translationCache.entries());
    for (const [k, v] of entries) {
      if (now - v.timestamp > CACHE_TTL) {
        translationCache.delete(k);
      }
    }
  }
}

// ============================================================================
// TRADUÇÃO COM DEEPL
// ============================================================================

/**
 * Traduz texto usando DeepL API
 */
export async function translateWithDeepL(
  text: string,
  targetLang: SupportedLanguage,
  sourceLang?: string
): Promise<TranslationResult> {
  // Verificar cache primeiro
  const cached = getFromCache(text, targetLang);
  if (cached) {
    return {
      success: true,
      translatedText: cached,
      targetLanguage: targetLang,
      provider: "cache",
      confidence: 1.0,
    };
  }

  const apiKey = process.env.DEEPL_API_KEY;
  
  if (!apiKey) {
    console.log("[Translation] DeepL API key não configurada, usando fallback");
    return translateWithFallback(text, targetLang);
  }

  try {
    // Mapear códigos de idioma para DeepL
    const deeplTargetLang = targetLang === "pt-BR" ? "PT-BR" : targetLang.toUpperCase();
    
    const response = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [text],
        target_lang: deeplTargetLang,
        source_lang: sourceLang?.toUpperCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.translations?.[0]?.text;
    const detectedSourceLang = data.translations?.[0]?.detected_source_language;

    if (translatedText) {
      // Salvar no cache
      setCache(text, targetLang, translatedText);
      
      return {
        success: true,
        translatedText,
        sourceLanguage: detectedSourceLang?.toLowerCase(),
        targetLanguage: targetLang,
        provider: "deepl",
        confidence: 0.99, // DeepL tem alta precisão
      };
    }

    throw new Error("Resposta vazia do DeepL");
  } catch (error) {
    console.error("[Translation] Erro DeepL:", error);
    return translateWithFallback(text, targetLang);
  }
}

/**
 * Tradução de fallback usando dicionário básico
 */
async function translateWithFallback(
  text: string,
  targetLang: SupportedLanguage
): Promise<TranslationResult> {
  // Dicionário básico para termos comuns do ERP
  const dictionary: Record<string, Record<SupportedLanguage, string>> = {
    // Termos de produção
    "produção": { "pt-BR": "produção", "en": "production", "es": "producción" },
    "estoque": { "pt-BR": "estoque", "en": "inventory", "es": "inventario" },
    "qualidade": { "pt-BR": "qualidade", "en": "quality", "es": "calidad" },
    "fornecedor": { "pt-BR": "fornecedor", "en": "supplier", "es": "proveedor" },
    "pagamento": { "pt-BR": "pagamento", "en": "payment", "es": "pago" },
    "alerta": { "pt-BR": "alerta", "en": "alert", "es": "alerta" },
    "crítico": { "pt-BR": "crítico", "en": "critical", "es": "crítico" },
    "pendente": { "pt-BR": "pendente", "en": "pending", "es": "pendiente" },
    "aprovado": { "pt-BR": "aprovado", "en": "approved", "es": "aprobado" },
    // Termos do Copiloto
    "insight": { "pt-BR": "insight", "en": "insight", "es": "insight" },
    "previsão": { "pt-BR": "previsão", "en": "forecast", "es": "pronóstico" },
    "sugestão": { "pt-BR": "sugestão", "en": "suggestion", "es": "sugerencia" },
  };

  // Tentar traduzir termos conhecidos
  let translatedText = text;
  for (const [term, translations] of Object.entries(dictionary)) {
    const regex = new RegExp(term, "gi");
    translatedText = translatedText.replace(regex, translations[targetLang] || term);
  }

  return {
    success: true,
    translatedText,
    targetLanguage: targetLang,
    provider: "fallback",
    confidence: 0.7, // Menor confiança para fallback
  };
}

// ============================================================================
// PROMPTS LLM POR IDIOMA
// ============================================================================

/**
 * Retorna configuração de prompts LLM adaptados por idioma
 */
export function getLLMPromptConfig(language: SupportedLanguage): LLMPromptConfig {
  const configs: Record<SupportedLanguage, LLMPromptConfig> = {
    "pt-BR": {
      language: "pt-BR",
      systemPrompt: `Você é o Copiloto IA da Coco Litorâneo, uma empresa de processamento de coco.
Seu papel é auxiliar na gestão do ERP, fornecendo insights, alertas e sugestões.

REGRAS:
- Responda SEMPRE em português brasileiro
- Use linguagem profissional mas acessível
- Formate respostas com: Resumo | Evidências | Sugestões | Riscos
- Cite dados específicos quando disponíveis
- Sugira ações concretas e executáveis
- Priorize informações críticas primeiro

CONTEXTO DA EMPRESA:
- Processamento de coco (flocos, ralado, leite)
- Fornecedores locais (produtores de coco)
- Controle de qualidade rigoroso (pH, Brix, temperatura)
- Gestão de estoque e produção`,
      userGreeting: "Olá! Sou o Copiloto IA da Coco Litorâneo. Como posso ajudar?",
      responseFormat: `**Resumo**: [Resposta principal]

**Evidências**: [Dados e fontes]

**Sugestões**: [Ações recomendadas]

**Riscos/Observações**: [Pontos de atenção]`,
      contextInstructions: "Analise o contexto do ERP e forneça insights relevantes para a operação.",
    },
    "en": {
      language: "en",
      systemPrompt: `You are the AI Copilot for Coco Litorâneo, a coconut processing company.
Your role is to assist with ERP management, providing insights, alerts, and suggestions.

RULES:
- ALWAYS respond in English
- Use professional but accessible language
- Format responses with: Summary | Evidence | Suggestions | Risks
- Cite specific data when available
- Suggest concrete and actionable steps
- Prioritize critical information first

COMPANY CONTEXT:
- Coconut processing (flakes, shredded, milk)
- Local suppliers (coconut producers)
- Strict quality control (pH, Brix, temperature)
- Inventory and production management`,
      userGreeting: "Hello! I'm the AI Copilot for Coco Litorâneo. How can I help?",
      responseFormat: `**Summary**: [Main response]

**Evidence**: [Data and sources]

**Suggestions**: [Recommended actions]

**Risks/Notes**: [Points of attention]`,
      contextInstructions: "Analyze the ERP context and provide relevant insights for operations.",
    },
    "es": {
      language: "es",
      systemPrompt: `Eres el Copiloto IA de Coco Litorâneo, una empresa de procesamiento de coco.
Tu rol es asistir en la gestión del ERP, proporcionando insights, alertas y sugerencias.

REGLAS:
- Responde SIEMPRE en español
- Usa lenguaje profesional pero accesible
- Formatea respuestas con: Resumen | Evidencias | Sugerencias | Riesgos
- Cita datos específicos cuando estén disponibles
- Sugiere acciones concretas y ejecutables
- Prioriza información crítica primero

CONTEXTO DE LA EMPRESA:
- Procesamiento de coco (hojuelas, rallado, leche)
- Proveedores locales (productores de coco)
- Control de calidad riguroso (pH, Brix, temperatura)
- Gestión de inventario y producción`,
      userGreeting: "¡Hola! Soy el Copiloto IA de Coco Litorâneo. ¿Cómo puedo ayudarte?",
      responseFormat: `**Resumen**: [Respuesta principal]

**Evidencias**: [Datos y fuentes]

**Sugerencias**: [Acciones recomendadas]

**Riesgos/Observaciones**: [Puntos de atención]`,
      contextInstructions: "Analiza el contexto del ERP y proporciona insights relevantes para la operación.",
    },
  };

  return configs[language] || configs["pt-BR"];
}

/**
 * Adapta um prompt existente para o idioma especificado
 */
export async function adaptPromptForLanguage(
  prompt: string,
  targetLang: SupportedLanguage
): Promise<string> {
  // Se já está no idioma alvo, retornar sem modificação
  if (targetLang === "pt-BR") {
    return prompt;
  }

  // Traduzir o prompt
  const result = await translateWithDeepL(prompt, targetLang);
  return result.translatedText || prompt;
}

/**
 * Gera resposta do Copiloto no idioma do usuário
 */
export function getLocalizedResponse(
  content: string,
  language: SupportedLanguage
): { content: string; language: SupportedLanguage } {
  // Por enquanto, retorna o conteúdo como está
  // Em produção, poderia traduzir automaticamente
  return { content, language };
}

// ============================================================================
// AUDITORIA DE TRADUÇÕES
// ============================================================================

/**
 * Registra uso de tradução para auditoria LGPD
 */
export async function logTranslationUsage(params: {
  userId: number;
  userName: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(auditLogs).values({
    userId: params.userId,
    userName: params.userName,
    action: "translation_used",
    module: "i18n",
    entityType: "translation",
    entityId: 0,
    details: {
      sourceTextLength: params.sourceText.length,
      translatedTextLength: params.translatedText.length,
      sourceLang: params.sourceLang,
      targetLang: params.targetLang,
      provider: params.provider,
      // Não armazenar texto completo por LGPD
    },
    ipAddress: "system",
    userAgent: "TranslationService",
  });
}

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export {
  translateWithFallback,
};
