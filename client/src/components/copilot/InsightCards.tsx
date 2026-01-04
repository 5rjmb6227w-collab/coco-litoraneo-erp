/**
 * InsightCards - Cards de insights gerados pela IA
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ExternalLink, 
  Check,
  X,
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";

interface Insight {
  id: number;
  insightType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  summary: string;
  details: unknown;
  evidenceIds: unknown;
  module: string | null;
  entityType: string | null;
  entityId: number | null;
  status: "active" | "dismissed" | "resolved";
  generatedAt: Date;
  dismissedAt: Date | null;
  dismissedBy: number | null;
  resolvedAt: Date | null;
  expiresAt: Date | null;
}

const severityConfig = {
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
  },
};

const moduleLabels: Record<string, string> = {
  almoxarifado: "Almoxarifado",
  pagamentos: "Pagamentos",
  estoque: "Estoque PA",
  financeiro: "Financeiro",
  qualidade: "Qualidade",
  compras: "Compras",
  producao: "Produção",
};

export function InsightCards() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const isAdmin = user?.role === "admin" || user?.role === "ceo";

  // Query
  const insightsQuery = trpc.ai.listInsights.useQuery({
    status: statusFilter as "active" | "dismissed" | "resolved" | undefined,
    severity: severityFilter !== "all" ? severityFilter as "info" | "warning" | "critical" : undefined,
    limit: 50,
  });

  // Mutations
  const dismissMutation = trpc.ai.dismissInsight.useMutation({
    onSuccess: () => {
      insightsQuery.refetch();
      toast.success("Insight dispensado");
    },
  });

  const resolveMutation = trpc.ai.resolveInsight.useMutation({
    onSuccess: () => {
      insightsQuery.refetch();
      toast.success("Insight resolvido");
    },
  });

  const runChecksMutation = trpc.ai.runInsightChecks.useMutation({
    onSuccess: (data) => {
      insightsQuery.refetch();
      toast.success("Verificações executadas com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao executar verificações: " + error.message);
    },
  });

  const insights = insightsQuery.data || [];

  const handleViewDetails = (insight: Insight) => {
    setSelectedInsight(insight);
  };

  const handleDismiss = (id: number) => {
    dismissMutation.mutate({ insightId: id });
  };

  const handleResolve = (id: number) => {
    resolveMutation.mutate({ insightId: id });
  };

  const handleRunChecks = () => {
    runChecksMutation.mutate();
  };

  // Agrupar por severidade
  const criticalInsights = insights.filter(i => i.severity === "critical");
  const warningInsights = insights.filter(i => i.severity === "warning");
  const infoInsights = insights.filter(i => i.severity === "info");

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-stone-800">Insights</h2>
          <Badge variant="secondary">{insights.length}</Badge>
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="dismissed">Dispensados</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="warning">Atenção</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRunChecks}
              disabled={runChecksMutation.isPending}
              className="gap-2"
            >
              {runChecksMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Verificar Agora
            </Button>
          )}
        </div>
      </div>

      {/* Loading */}
      {insightsQuery.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      )}

      {/* Empty state */}
      {!insightsQuery.isLoading && insights.length === 0 && (
        <Card className="p-8 text-center">
          <Lightbulb className="h-12 w-12 mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-medium text-stone-700 mb-2">
            Nenhum insight encontrado
          </h3>
          <p className="text-sm text-stone-500">
            {statusFilter === "active" 
              ? "Não há insights ativos no momento. Tudo parece estar em ordem!"
              : `Não há insights ${statusFilter === "dismissed" ? "dispensados" : "resolvidos"}.`
            }
          </p>
        </Card>
      )}

      {/* Insights críticos */}
      {criticalInsights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Críticos ({criticalInsights.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {criticalInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewDetails={() => handleViewDetails(insight)}
                onDismiss={() => handleDismiss(insight.id)}
                onResolve={() => handleResolve(insight.id)}
                isLoading={dismissMutation.isPending || resolveMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Insights de atenção */}
      {warningInsights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-amber-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Atenção ({warningInsights.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {warningInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewDetails={() => handleViewDetails(insight)}
                onDismiss={() => handleDismiss(insight.id)}
                onResolve={() => handleResolve(insight.id)}
                isLoading={dismissMutation.isPending || resolveMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Insights informativos */}
      {infoInsights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Informativos ({infoInsights.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {infoInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewDetails={() => handleViewDetails(insight)}
                onDismiss={() => handleDismiss(insight.id)}
                onResolve={() => handleResolve(insight.id)}
                isLoading={dismissMutation.isPending || resolveMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      <Dialog open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedInsight && (
                <>
                  {(() => {
                    const config = severityConfig[selectedInsight.severity];
                    const Icon = config.icon;
                    return <Icon className={cn("h-5 w-5", config.color)} />;
                  })()}
                  {selectedInsight.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedInsight?.module && (
                <Badge variant="outline" className="mt-2">
                  {moduleLabels[selectedInsight.module] || selectedInsight.module}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedInsight && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-stone-700 mb-1">Resumo</h4>
                <p className="text-sm text-stone-600">{selectedInsight.summary}</p>
              </div>

              {(() => {
                if (selectedInsight.details && typeof selectedInsight.details === 'object') {
                  return (
                    <div>
                      <h4 className="text-sm font-medium text-stone-700 mb-2">Evidências</h4>
                      <div className="bg-stone-50 rounded-lg p-3 text-sm">
                        <pre className="whitespace-pre-wrap text-stone-600">
                          {JSON.stringify(selectedInsight.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}



              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleDismiss(selectedInsight.id);
                    setSelectedInsight(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Dispensar
                </Button>
                <Button 
                  onClick={() => {
                    handleResolve(selectedInsight.id);
                    setSelectedInsight(null);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Marcar Resolvido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de card individual
interface InsightCardProps {
  insight: Insight;
  onViewDetails: () => void;
  onDismiss: () => void;
  onResolve: () => void;
  isLoading: boolean;
}

function InsightCard({ insight, onViewDetails, onDismiss, onResolve, isLoading }: InsightCardProps) {
  const config = severityConfig[insight.severity];
  const Icon = config.icon;

  return (
    <Card className={cn("border", config.border, config.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", config.bg)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-stone-800 text-sm">{insight.title}</h4>
              <Badge className={cn("text-xs flex-shrink-0", config.badge)}>
                {insight.severity === "critical" ? "Crítico" : 
                 insight.severity === "warning" ? "Atenção" : "Info"}
              </Badge>
            </div>

            <p className="text-sm text-stone-600 mt-1 line-clamp-2">
              {insight.summary}
            </p>

            {insight.module && (
              <Badge variant="outline" className="mt-2 text-xs">
                {moduleLabels[insight.module] || insight.module}
              </Badge>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={onViewDetails}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver detalhes
              </Button>


            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
