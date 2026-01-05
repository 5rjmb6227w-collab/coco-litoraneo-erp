/**
 * LanguageSwitcher - Componente para trocar idioma
 * Bloco 8/9 - Switch de idioma seamless no UX
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguageInfo,
  type SupportedLanguage,
} from "@/lib/i18n";

interface LanguageSwitcherProps {
  variant?: "icon" | "full" | "compact";
  className?: string;
}

export function LanguageSwitcher({ variant = "icon", className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);
  const currentLang = getCurrentLanguageInfo();

  const handleChangeLanguage = async (lang: SupportedLanguage) => {
    if (lang === i18n.language) return;
    
    setIsChanging(true);
    try {
      await changeLanguage(lang);
    } catch (error) {
      console.error("Erro ao trocar idioma:", error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === "icon" ? "icon" : "default"}
          className={className}
          disabled={isChanging}
          aria-label={t("i18n.changeLanguage")}
        >
          {variant === "icon" ? (
            <Globe className="h-5 w-5" />
          ) : variant === "compact" ? (
            <>
              <span className="mr-1">{currentLang.flag}</span>
              <span className="text-xs">{currentLang.code.toUpperCase()}</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 mr-2" />
              <span>{currentLang.name}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChangeLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
            {i18n.language === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
