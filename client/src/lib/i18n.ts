/**
 * Configuração de Internacionalização (i18n)
 * Bloco 8/9 - Suporte a PT-BR, EN, ES com detecção automática
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

// Idiomas suportados
export const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", name: "Português (Brasil)", flag: "🇧🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Idioma padrão (pode ser sobrescrito por env)
const DEFAULT_LANGUAGE: SupportedLanguage = 
  (import.meta.env.VITE_DEFAULT_LANGUAGE as SupportedLanguage) || "pt-BR";

// Inicialização do i18n
i18n
  .use(HttpBackend) // Carrega traduções via HTTP
  .use(LanguageDetector) // Detecta idioma do navegador
  .use(initReactI18next) // Integração com React
  .init({
    // Configurações básicas
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    
    // Backend para carregar arquivos JSON
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },
    
    // Detecção de idioma
    detection: {
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      lookupQuerystring: "lang",
      lookupLocalStorage: "coco_language",
      caches: ["localStorage"],
    },
    
    // Interpolação
    interpolation: {
      escapeValue: false, // React já faz escape
    },
    
    // Namespace padrão
    defaultNS: "translation",
    ns: ["translation"],
    
    // Debug em desenvolvimento
    debug: import.meta.env.DEV,
    
    // React Suspense
    react: {
      useSuspense: true,
    },
  });

/**
 * Altera o idioma atual
 */
export function changeLanguage(lang: SupportedLanguage): Promise<void> {
  return new Promise((resolve, reject) => {
    i18n.changeLanguage(lang, (err) => {
      if (err) {
        console.error("[i18n] Erro ao alterar idioma:", err);
        reject(err);
      } else {
        // Salvar preferência
        localStorage.setItem("coco_language", lang);
        // Atualizar atributo lang do HTML
        document.documentElement.lang = lang;
        resolve();
      }
    });
  });
}

/**
 * Retorna o idioma atual
 */
export function getCurrentLanguage(): SupportedLanguage {
  return i18n.language as SupportedLanguage;
}

/**
 * Verifica se um idioma é suportado
 */
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some((l) => l.code === lang);
}

/**
 * Retorna informações do idioma atual
 */
export function getCurrentLanguageInfo() {
  const current = getCurrentLanguage();
  return SUPPORTED_LANGUAGES.find((l) => l.code === current) || SUPPORTED_LANGUAGES[0];
}

/**
 * Formata data de acordo com o idioma atual
 */
export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  const lang = getCurrentLanguage();
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  };
  
  return d.toLocaleDateString(lang, defaultOptions);
}

/**
 * Formata número de acordo com o idioma atual
 */
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  const lang = getCurrentLanguage();
  return num.toLocaleString(lang, options);
}

/**
 * Formata moeda de acordo com o idioma atual
 */
export function formatCurrency(value: number, currency: string = "BRL"): string {
  const lang = getCurrentLanguage();
  return value.toLocaleString(lang, {
    style: "currency",
    currency,
  });
}

export default i18n;
