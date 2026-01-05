/**
 * AttachmentViewer - Modal para visualização de anexos processados com highlights
 * Bloco 6/9 - UX aprimorada para análise de laudos e fotos
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Video,
  Music,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Beaker,
  Thermometer,
  Scale,
  Calendar,
  Hash,
  DollarSign,
} from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================

interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface AttachmentSource {
  id: number;
  entityType: string;
  entityId: number;
  label: string;
  url?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  extractedText?: string | null;
  extractedEntities?: ExtractedEntity[] | unknown | null;
  confidenceScore?: string | number | null;
  processedAt?: Date | string | null;
  processedBy?: string | null;
  createdAt: Date | string;
}

interface AttachmentViewerProps {
  sourceId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// ÍCONES POR TIPO
// ============================================================================

const getTypeIcon = (type: string) => {
  switch (type) {
    case "image":
      return <ImageIcon className="h-4 w-4" />;
    case "pdf":
      return <FileText className="h-4 w-4" />;
    case "document":
      return <FileSpreadsheet className="h-4 w-4" />;
    case "video":
      return <Video className="h-4 w-4" />;
    case "audio":
      return <Music className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getEntityIcon = (type: string) => {
  switch (type) {
    case "ph":
    case "brix":
    case "acidez":
      return <Beaker className="h-4 w-4 text-purple-500" />;
    case "temperatura":
      return <Thermometer className="h-4 w-4 text-red-500" />;
    case "peso":
    case "quantidade":
      return <Scale className="h-4 w-4 text-blue-500" />;
    case "data":
      return <Calendar className="h-4 w-4 text-green-500" />;
    case "lote":
    case "codigo":
      return <Hash className="h-4 w-4 text-orange-500" />;
    case "valor":
    case "preco":
      return <DollarSign className="h-4 w-4 text-emerald-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AttachmentViewer({ sourceId, open, onOpenChange }: AttachmentViewerProps) {
  const [activeTab, setActiveTab] = useState("preview");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Query para obter detalhes do anexo
  const { data: attachment, isLoading, error } = trpc.ai.getAttachmentDetails.useQuery(
    { sourceId },
    { enabled: open && sourceId > 0 }
  );

  // Mutation para feedback
  const submitFeedback = trpc.ai.submitFeedback.useMutation({
    onSuccess: () => {
      setFeedbackSent(true);
      toast.success("Feedback enviado! Obrigado por ajudar a melhorar o sistema.");
    },
    onError: () => {
      toast.error("Erro ao enviar feedback");
    },
  });

  // Parse das entidades extraídas
  const extractedEntities: ExtractedEntity[] = (() => {
    if (!attachment?.extractedEntities) return [];
    if (Array.isArray(attachment.extractedEntities)) return attachment.extractedEntities as ExtractedEntity[];
    try {
      const parsed = typeof attachment.extractedEntities === "string" 
        ? JSON.parse(attachment.extractedEntities)
        : attachment.extractedEntities;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  // Confiança do processamento
  const confidenceScore = attachment?.confidenceScore 
    ? (typeof attachment.confidenceScore === "string" 
        ? parseFloat(attachment.confidenceScore) 
        : attachment.confidenceScore) * 100
    : 0;

  // Copiar texto extraído
  const handleCopyText = () => {
    if (attachment?.extractedText) {
      navigator.clipboard.writeText(attachment.extractedText);
      toast.success("Texto copiado!");
    }
  };

  // Enviar feedback
  const handleFeedback = (isPositive: boolean) => {
    submitFeedback.mutate({
      messageId: sourceId, // Usando sourceId como messageId para feedback de anexos
      feedbackType: isPositive ? "like" : "dislike",
      comment: isPositive ? "Extração correta" : "Extração incorreta",
    });
  };

  // Renderizar loading
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando anexo...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Renderizar erro
  if (error || !attachment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">Erro ao carregar anexo</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error?.message || "Anexo não encontrado"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(attachment.attachmentType || "document")}
            {attachment.label}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <Badge variant="outline" className="capitalize">
              {attachment.attachmentType || "documento"}
            </Badge>
            {attachment.processedAt && (
              <span className="text-xs">
                Processado em {new Date(attachment.processedAt).toLocaleString("pt-BR")}
              </span>
            )}
            {confidenceScore > 0 && (
              <Badge 
                variant={confidenceScore >= 90 ? "default" : confidenceScore >= 70 ? "secondary" : "destructive"}
              >
                {confidenceScore.toFixed(0)}% confiança
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="h-4 w-4 mr-2" />
              Texto Extraído
            </TabsTrigger>
            <TabsTrigger value="entities">
              <Beaker className="h-4 w-4 mr-2" />
              Entidades ({extractedEntities.length})
            </TabsTrigger>
            <TabsTrigger value="info">
              <Info className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
          </TabsList>

          {/* Preview do Anexo */}
          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {attachment.attachmentUrl ? (
                  <div className="relative">
                    {attachment.attachmentType === "image" ? (
                      <div className="relative">
                        <img
                          src={attachment.attachmentUrl}
                          alt={attachment.label}
                          className="max-w-full max-h-[500px] mx-auto rounded-lg shadow-lg"
                        />
                        {/* Overlay com bounding boxes das entidades */}
                        {extractedEntities.filter(e => e.boundingBox).map((entity, idx) => (
                          <div
                            key={idx}
                            className="absolute border-2 border-primary bg-primary/10 rounded"
                            style={{
                              left: `${(entity.boundingBox?.x || 0) * 100}%`,
                              top: `${(entity.boundingBox?.y || 0) * 100}%`,
                              width: `${(entity.boundingBox?.width || 0) * 100}%`,
                              height: `${(entity.boundingBox?.height || 0) * 100}%`,
                            }}
                            title={`${entity.type}: ${entity.value}`}
                          />
                        ))}
                      </div>
                    ) : attachment.attachmentType === "pdf" ? (
                      <iframe
                        src={attachment.attachmentUrl}
                        className="w-full h-[500px] rounded-lg border"
                        title={attachment.label}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        {getTypeIcon(attachment.attachmentType || "document")}
                        <p className="mt-4 text-muted-foreground">
                          Preview não disponível para este tipo de arquivo
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => attachment.attachmentUrl && window.open(attachment.attachmentUrl, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir em nova aba
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">URL do anexo não disponível</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Texto Extraído */}
          <TabsContent value="text" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Texto Extraído via OCR</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleCopyText}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  {attachment.extractedText ? (
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {attachment.extractedText}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {attachment.processedAt 
                          ? "Nenhum texto extraído deste anexo"
                          : "Anexo ainda não processado"}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Entidades Extraídas */}
          <TabsContent value="entities" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Entidades Detectadas ({extractedEntities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {extractedEntities.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {extractedEntities.map((entity, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {getEntityIcon(entity.type)}
                            <div>
                              <p className="font-medium capitalize">{entity.type}</p>
                              <p className="text-lg font-semibold text-primary">
                                {entity.value}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                entity.confidence >= 0.9
                                  ? "default"
                                  : entity.confidence >= 0.7
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {(entity.confidence * 100).toFixed(0)}%
                            </Badge>
                            {entity.confidence >= 0.9 ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : entity.confidence >= 0.7 ? (
                              <Info className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {attachment.processedAt
                        ? "Nenhuma entidade detectada neste anexo"
                        : "Anexo ainda não processado"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Informações */}
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ID do Source</p>
                    <p className="font-medium">{attachment.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tipo de Entidade</p>
                    <p className="font-medium capitalize">{attachment.entityType}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">ID da Entidade</p>
                    <p className="font-medium">{attachment.entityId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Tipo de Anexo</p>
                    <p className="font-medium capitalize">{attachment.attachmentType || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Processado por</p>
                    <p className="font-medium">{attachment.processedBy || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Confiança</p>
                    <p className="font-medium">{confidenceScore.toFixed(1)}%</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {new Date(attachment.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {attachment.url && (
                    <div className="col-span-2 space-y-1">
                      <p className="text-sm text-muted-foreground">Link para Registro</p>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => window.location.href = attachment.url!}
                      >
                        {attachment.url}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Feedback e Ações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">A extração está correta?</span>
            {feedbackSent ? (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Feedback enviado
              </Badge>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback(true)}
                  disabled={submitFeedback.isPending}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Sim
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback(false)}
                  disabled={submitFeedback.isPending}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Não
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {attachment.url && (
              <Button
                variant="outline"
                onClick={() => window.location.href = attachment.url!}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Registro Original
              </Button>
            )}
            <Button variant="default" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// COMPONENTE DE BOTÃO PARA ABRIR O VIEWER
// ============================================================================

interface AttachmentViewerButtonProps {
  sourceId: number;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function AttachmentViewerButton({
  sourceId,
  label = "Ver Anexo Processado",
  variant = "outline",
  size = "sm",
}: AttachmentViewerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Eye className="h-4 w-4 mr-2" />
        {label}
      </Button>
      <AttachmentViewer sourceId={sourceId} open={open} onOpenChange={setOpen} />
    </>
  );
}

// ============================================================================
// COMPONENTE DE LISTA DE ANEXOS PROCESSADOS
// ============================================================================

interface ProcessedAttachmentsListProps {
  entityType?: string;
  entityId?: number;
  limit?: number;
}

export function ProcessedAttachmentsList({
  entityType,
  entityId,
  limit = 10,
}: ProcessedAttachmentsListProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);

  const { data: attachments, isLoading } = trpc.ai.listProcessedAttachments.useQuery({
    entityType,
    entityId,
    limit,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum anexo processado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setSelectedSourceId(attachment.id)}
          >
            <div className="flex items-center gap-3">
              {getTypeIcon(attachment.attachmentType || "document")}
              <div>
                <p className="font-medium">{attachment.label}</p>
                <p className="text-xs text-muted-foreground">
                  {attachment.processedAt
                    ? `Processado em ${new Date(attachment.processedAt).toLocaleString("pt-BR")}`
                    : "Pendente de processamento"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {attachment.confidenceScore && (
                <Badge
                  variant={
                    Number(attachment.confidenceScore) >= 0.9
                      ? "default"
                      : Number(attachment.confidenceScore) >= 0.7
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {(Number(attachment.confidenceScore) * 100).toFixed(0)}%
                </Badge>
              )}
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>
      {selectedSourceId && (
        <AttachmentViewer
          sourceId={selectedSourceId}
          open={!!selectedSourceId}
          onOpenChange={(open) => !open && setSelectedSourceId(null)}
        />
      )}
    </>
  );
}

export default AttachmentViewer;
