/**
 * FeedbackTutorial - Tutorial in-app para sistema de feedback
 * Bloco 8/9 - Onboarding de feedback obrigatório
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  CheckCircle2, 
  ArrowRight,
  X,
  Lightbulb,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface FeedbackTutorialProps {
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    icon: Star,
    titleKey: "tutorial.feedback.step1.title",
    descriptionKey: "tutorial.feedback.step1.description",
    image: null,
  },
  {
    icon: MessageSquare,
    titleKey: "tutorial.feedback.step2.title",
    descriptionKey: "tutorial.feedback.step2.description",
    image: null,
  },
  {
    icon: ThumbsUp,
    titleKey: "tutorial.feedback.step3.title",
    descriptionKey: "tutorial.feedback.step3.description",
    image: null,
  },
  {
    icon: Lightbulb,
    titleKey: "tutorial.feedback.step4.title",
    descriptionKey: "tutorial.feedback.step4.description",
    image: null,
  },
];

// Traduções inline para o tutorial (fallback)
const TUTORIAL_TRANSLATIONS: Record<string, Record<string, string>> = {
  "pt-BR": {
    "tutorial.feedback.step1.title": "Avalie as Respostas",
    "tutorial.feedback.step1.description": "Após cada resposta do Copiloto IA, você verá um modal de avaliação. Use as estrelas para indicar a qualidade da resposta (1-5).",
    "tutorial.feedback.step2.title": "Deixe seu Comentário",
    "tutorial.feedback.step2.description": "Seu comentário é obrigatório e nos ajuda a melhorar. Descreva o que funcionou bem ou o que poderia ser melhor.",
    "tutorial.feedback.step3.title": "Selecione Áreas de Melhoria",
    "tutorial.feedback.step3.description": "Marque as áreas que precisam de atenção: precisão, relevância, clareza, completude ou ações sugeridas.",
    "tutorial.feedback.step4.title": "Ajude-nos a Melhorar",
    "tutorial.feedback.step4.description": "Seu feedback é usado para retreinar o modelo trimestralmente, tornando o Copiloto cada vez mais útil para você.",
    "tutorial.feedback.skip": "Pular Tutorial",
    "tutorial.feedback.next": "Próximo",
    "tutorial.feedback.finish": "Entendi!",
    "tutorial.feedback.title": "Como Avaliar o Copiloto IA",
  },
  "en": {
    "tutorial.feedback.step1.title": "Rate the Responses",
    "tutorial.feedback.step1.description": "After each AI Copilot response, you'll see a rating modal. Use the stars to indicate the response quality (1-5).",
    "tutorial.feedback.step2.title": "Leave Your Comment",
    "tutorial.feedback.step2.description": "Your comment is required and helps us improve. Describe what worked well or what could be better.",
    "tutorial.feedback.step3.title": "Select Improvement Areas",
    "tutorial.feedback.step3.description": "Check the areas that need attention: accuracy, relevance, clarity, completeness, or suggested actions.",
    "tutorial.feedback.step4.title": "Help Us Improve",
    "tutorial.feedback.step4.description": "Your feedback is used to retrain the model quarterly, making the Copilot increasingly useful for you.",
    "tutorial.feedback.skip": "Skip Tutorial",
    "tutorial.feedback.next": "Next",
    "tutorial.feedback.finish": "Got it!",
    "tutorial.feedback.title": "How to Rate the AI Copilot",
  },
  "es": {
    "tutorial.feedback.step1.title": "Evalúa las Respuestas",
    "tutorial.feedback.step1.description": "Después de cada respuesta del Copiloto IA, verás un modal de evaluación. Usa las estrellas para indicar la calidad de la respuesta (1-5).",
    "tutorial.feedback.step2.title": "Deja tu Comentario",
    "tutorial.feedback.step2.description": "Tu comentario es obligatorio y nos ayuda a mejorar. Describe qué funcionó bien o qué podría ser mejor.",
    "tutorial.feedback.step3.title": "Selecciona Áreas de Mejora",
    "tutorial.feedback.step3.description": "Marca las áreas que necesitan atención: precisión, relevancia, claridad, completitud o acciones sugeridas.",
    "tutorial.feedback.step4.title": "Ayúdanos a Mejorar",
    "tutorial.feedback.step4.description": "Tu feedback se usa para reentrenar el modelo trimestralmente, haciendo el Copiloto cada vez más útil para ti.",
    "tutorial.feedback.skip": "Saltar Tutorial",
    "tutorial.feedback.next": "Siguiente",
    "tutorial.feedback.finish": "¡Entendido!",
    "tutorial.feedback.title": "Cómo Evaluar el Copiloto IA",
  },
};

export function FeedbackTutorial({ onComplete }: FeedbackTutorialProps) {
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [open, setOpen] = useState(true);

  // Função de tradução com fallback
  const translate = (key: string): string => {
    const translated = t(key);
    if (translated !== key) return translated;
    
    // Fallback para traduções inline
    const lang = i18n.language as keyof typeof TUTORIAL_TRANSLATIONS;
    const translations = TUTORIAL_TRANSLATIONS[lang] || TUTORIAL_TRANSLATIONS["pt-BR"];
    return translations[key] || key;
  };

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    // Salvar que o usuário completou o tutorial
    localStorage.setItem("coco_feedback_tutorial_completed", "true");
    setOpen(false);
    onComplete();
  };

  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            {translate("tutorial.feedback.title")}
          </DialogTitle>
          <DialogDescription>
            Passo {currentStep + 1} de {TUTORIAL_STEPS.length}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        <div className="py-6 space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <StepIcon className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">
              {translate(step.titleKey)}
            </h3>
            <p className="text-muted-foreground text-sm">
              {translate(step.descriptionKey)}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            {translate("tutorial.feedback.skip")}
          </Button>
          <Button onClick={handleNext}>
            {currentStep < TUTORIAL_STEPS.length - 1 ? (
              <>
                {translate("tutorial.feedback.next")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {translate("tutorial.feedback.finish")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook para verificar se deve mostrar o tutorial
 */
export function useFeedbackTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("coco_feedback_tutorial_completed");
    if (!completed) {
      // Mostrar tutorial após 2 segundos na primeira visita ao Copiloto
      const timer = setTimeout(() => setShowTutorial(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTutorial = () => {
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem("coco_feedback_tutorial_completed");
    setShowTutorial(true);
  };

  return { showTutorial, completeTutorial, resetTutorial };
}

export default FeedbackTutorial;
