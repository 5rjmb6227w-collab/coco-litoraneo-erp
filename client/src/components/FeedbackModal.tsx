/**
 * FeedbackModal - Modal de feedback obrigatório após respostas do Copiloto
 * Bloco 8/9 - Feedback avançado com rating, comentário e áreas de melhoria
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Star, ThumbsUp, ThumbsDown, Minus, X, Send, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getCurrentLanguage } from "@/lib/i18n";

type FeedbackType = "like" | "dislike" | "neutral";
type InteractionType = "chat" | "insight" | "alert" | "action" | "prediction";
type ImprovementArea = "accuracy" | "relevance" | "clarity" | "completeness" | "actionability";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  messageId?: number;
  insightId?: number;
  actionId?: number;
  predictionId?: number;
  interactionType: InteractionType;
  responseTimeMs?: number;
  sessionDuration?: number;
  experimentId?: string;
  variant?: string;
  allowSkip?: boolean;
}

const IMPROVEMENT_AREAS: { key: ImprovementArea; labelKey: string }[] = [
  { key: "accuracy", labelKey: "copilot.feedback.improvementAreas.accuracy" },
  { key: "relevance", labelKey: "copilot.feedback.improvementAreas.relevance" },
  { key: "clarity", labelKey: "copilot.feedback.improvementAreas.clarity" },
  { key: "completeness", labelKey: "copilot.feedback.improvementAreas.completeness" },
  { key: "actionability", labelKey: "copilot.feedback.improvementAreas.actionability" },
];

export function FeedbackModal({
  open,
  onClose,
  onSubmit,
  messageId,
  insightId,
  actionId,
  predictionId,
  interactionType,
  responseTimeMs,
  sessionDuration,
  experimentId,
  variant,
  allowSkip = false,
}: FeedbackModalProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<ImprovementArea[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showError, setShowError] = useState(false);

  const submitFeedback = trpc.ai.submitAdvancedFeedback.useMutation({
    onSuccess: () => {
      toast.success(t("copilot.feedback.thanks"));
      resetForm();
      onSubmit?.();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || t("errors.generic"));
    },
  });

  const resetForm = () => {
    setRating(0);
    setFeedbackType(null);
    setComment("");
    setSelectedAreas([]);
    setShowError(false);
  };

  const handleRatingClick = (value: number) => {
    setRating(value);
    // Auto-set feedback type based on rating
    if (value >= 4) {
      setFeedbackType("like");
    } else if (value <= 2) {
      setFeedbackType("dislike");
    } else {
      setFeedbackType("neutral");
    }
    setShowError(false);
  };

  const handleFeedbackTypeClick = (type: FeedbackType) => {
    setFeedbackType(type);
    // Auto-set rating based on type if not set
    if (rating === 0) {
      if (type === "like") setRating(5);
      else if (type === "dislike") setRating(1);
      else setRating(3);
    }
    setShowError(false);
  };

  const toggleArea = (area: ImprovementArea) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const handleSubmit = async () => {
    // Validação
    if (rating === 0 || !feedbackType) {
      setShowError(true);
      return;
    }

    if (comment.trim().length < 10) {
      toast.error(t("copilot.feedback.comment") + " - " + t("common.required"));
      return;
    }

    setIsSubmitting(true);

    try {
      await submitFeedback.mutateAsync({
        messageId,
        insightId,
        actionId,
        predictionId,
        rating,
        feedbackType,
        comment: comment.trim(),
        improvementAreas: selectedAreas,
        interactionType,
        responseTimeMs,
        sessionDuration,
        language: getCurrentLanguage(),
        experimentId,
        variant,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (allowSkip) {
      toast.warning(t("feedback.modal.skipWarning"));
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            {t("feedback.modal.title")}
          </DialogTitle>
          <DialogDescription>
            {t("feedback.modal.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Stars */}
          <div className="space-y-2">
            <Label>{t("feedback.modal.rating")}</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRatingClick(value)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-8 w-8 ${
                      value <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {showError && rating === 0 && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {t("copilot.feedback.required")}
              </p>
            )}
          </div>

          {/* Quick Feedback Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={feedbackType === "like" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFeedbackTypeClick("like")}
              className={feedbackType === "like" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              {t("copilot.feedback.like")}
            </Button>
            <Button
              variant={feedbackType === "neutral" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFeedbackTypeClick("neutral")}
              className={feedbackType === "neutral" ? "bg-gray-600 hover:bg-gray-700" : ""}
            >
              <Minus className="h-4 w-4 mr-1" />
              Neutro
            </Button>
            <Button
              variant={feedbackType === "dislike" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFeedbackTypeClick("dislike")}
              className={feedbackType === "dislike" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              <ThumbsDown className="h-4 w-4 mr-1" />
              {t("copilot.feedback.dislike")}
            </Button>
          </div>

          {/* Comment (Required) */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              {t("copilot.feedback.comment")} *
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("copilot.feedback.commentPlaceholder")}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {comment.length}/10 caracteres mínimos
            </p>
          </div>

          {/* Improvement Areas */}
          <div className="space-y-2">
            <Label>{t("feedback.modal.whatImprove")}</Label>
            <div className="grid grid-cols-1 gap-2">
              {IMPROVEMENT_AREAS.map(({ key, labelKey }) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={selectedAreas.includes(key)}
                    onCheckedChange={() => toggleArea(key)}
                  />
                  <Label
                    htmlFor={key}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t(labelKey)}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          {allowSkip ? (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              {t("feedback.modal.skip")}
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0 || !feedbackType || comment.trim().length < 10}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t("common.loading")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t("feedback.modal.submit")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackModal;
