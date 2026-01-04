/**
 * ActionsQueue - Fila de ações sugeridas pela IA
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ListTodo, 
  Check, 
  X, 
  Play, 
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";

interface Action {
  id: number;
  insightId: number | null;
  conversationId: number | null;
  actionType: string;
  title: string;
  description: string | null;
  targetModule: string;
  targetMutation: string;
  payload: unknown;
  status: "suggested" | "approved" | "rejected" | "executed" | "failed";
  suggestedAt: Date;
  createdBy: number | null;
}

const statusConfig = {
  suggested: { 
    label: "Sugerida", 
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  approved: { 
    label: "Aprovada", 
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  rejected: { 
    label: "Rejeitada", 
    color: "bg-stone-100 text-stone-700",
    icon: XCircle,
  },
  executed: { 
    label: "Executada", 
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  failed: { 
    label: "Falhou", 
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
};

const priorityConfig = {
  low: { label: "Baixa", color: "bg-stone-100 text-stone-600" },
  medium: { label: "Média", color: "bg-blue-100 text-blue-700" },
  high: { label: "Alta", color: "bg-amber-100 text-amber-700" },
  critical: { label: "Crítica", color: "bg-red-100 text-red-700" },
};

const actionTypeLabels: Record<string, string> = {
  create_purchase_request: "Criar Solicitação de Compra",
  approve_payment: "Aprovar Pagamento",
  schedule_payment: "Agendar Pagamento",
  adjust_stock: "Ajustar Estoque",
  create_nc: "Criar Não Conformidade",
  notify_team: "Notificar Equipe",
  generate_report: "Gerar Relatório",
};

export function ActionsQueue() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("suggested");
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "ceo";

  // Query
  const actionsQuery = trpc.ai.listActions.useQuery({
    status: statusFilter !== "all" ? statusFilter as Action["status"] : undefined,
    limit: 50,
  });

  // Mutations
  const approveMutation = trpc.ai.approveAction.useMutation({
    onSuccess: () => {
      actionsQuery.refetch();
      toast.success("Ação aprovada");
      setSelectedAction(null);
    },
    onError: (error) => {
      toast.error("Erro ao aprovar ação: " + error.message);
    },
  });

  const rejectMutation = trpc.ai.rejectAction.useMutation({
    onSuccess: () => {
      actionsQuery.refetch();
      toast.success("Ação rejeitada");
      setShowRejectDialog(false);
      setSelectedAction(null);
      setRejectReason("");
    },
    onError: (error) => {
      toast.error("Erro ao rejeitar ação: " + error.message);
    },
  });

  const actions = actionsQuery.data || [];

  const handleApprove = (actionId: number) => {
    approveMutation.mutate({ actionId });
  };

  const handleReject = () => {
    if (!selectedAction || !rejectReason.trim()) return;
    rejectMutation.mutate({ 
      actionId: selectedAction.id, 
      reason: rejectReason.trim() 
    });
  };

  const openRejectDialog = (action: Action) => {
    setSelectedAction(action);
    setShowRejectDialog(true);
  };

  // Agrupar por status
  const suggestedActions = actions.filter(a => a.status === "suggested");
  const approvedActions = actions.filter(a => a.status === "approved");
  const executedActions = actions.filter(a => a.status === "executed");
  const rejectedActions = actions.filter(a => a.status === "rejected");
  const failedActions = actions.filter(a => a.status === "failed");

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ListTodo className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-stone-800">Ações Sugeridas</h2>
          <Badge variant="secondary">{actions.length}</Badge>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="suggested">Sugeridas</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="executed">Executadas</SelectItem>
            <SelectItem value="rejected">Rejeitadas</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {actionsQuery.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      )}

      {/* Empty state */}
      {!actionsQuery.isLoading && actions.length === 0 && (
        <Card className="p-8 text-center">
          <ListTodo className="h-12 w-12 mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-medium text-stone-700 mb-2">
            Nenhuma ação encontrada
          </h3>
          <p className="text-sm text-stone-500">
            {statusFilter === "suggested" 
              ? "Não há ações sugeridas no momento."
              : `Não há ações ${statusConfig[statusFilter as keyof typeof statusConfig]?.label.toLowerCase() || ""}.`
            }
          </p>
        </Card>
      )}

      {/* Ações sugeridas (aguardando aprovação) */}
      {suggestedActions.length > 0 && (statusFilter === "all" || statusFilter === "suggested") && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-amber-700 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Aguardando Aprovação ({suggestedActions.length})
          </h3>
          <div className="space-y-2">
            {suggestedActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onApprove={isAdmin ? () => handleApprove(action.id) : undefined}
                onReject={isAdmin ? () => openRejectDialog(action) : undefined}
                isLoading={approveMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ações aprovadas */}
      {approvedActions.length > 0 && (statusFilter === "all" || statusFilter === "approved") && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Aprovadas ({approvedActions.length})
          </h3>
          <div className="space-y-2">
            {approvedActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {/* Ações executadas */}
      {executedActions.length > 0 && (statusFilter === "all" || statusFilter === "executed") && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Executadas ({executedActions.length})
          </h3>
          <div className="space-y-2">
            {executedActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {/* Ações rejeitadas */}
      {rejectedActions.length > 0 && (statusFilter === "all" || statusFilter === "rejected") && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-stone-500 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejeitadas ({rejectedActions.length})
          </h3>
          <div className="space-y-2">
            {rejectedActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {/* Ações com falha */}
      {failedActions.length > 0 && (statusFilter === "all" || statusFilter === "failed") && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Falhas ({failedActions.length})
          </h3>
          <div className="space-y-2">
            {failedActions.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}

      {/* Dialog de rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Ação</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da rejeição.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de card de ação
interface ActionCardProps {
  action: Action;
  onApprove?: () => void;
  onReject?: () => void;
  isLoading?: boolean;
}

function ActionCard({ action, onApprove, onReject, isLoading }: ActionCardProps) {
  const config = statusConfig[action.status];
  const StatusIcon = config.icon;

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-stone-100 rounded-lg">
            <StatusIcon className={cn("h-5 w-5", 
              action.status === "suggested" ? "text-amber-600" :
              action.status === "approved" ? "text-blue-600" :
              action.status === "executed" ? "text-green-600" :
              action.status === "rejected" ? "text-stone-500" :
              "text-red-600"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-stone-800 text-sm">
                  {action.title || actionTypeLabels[action.actionType] || action.actionType}
                </h4>
                {action.description && (
                  <p className="text-sm text-stone-600 mt-1">
                    {action.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                <Badge className={cn("text-xs", config.color)}>
                  {config.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {action.targetModule}
                </Badge>
              </div>
            </div>

            {(() => {
              if (action.payload && typeof action.payload === 'object' && Object.keys(action.payload as object).length > 0) {
                return (
                  <div className="mt-2 p-2 bg-stone-50 rounded text-xs">
                    <span className="text-stone-500">Parâmetros: </span>
                    <span className="text-stone-700">
                      {JSON.stringify(action.payload)}
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-stone-500">
                {new Date(action.suggestedAt).toLocaleString("pt-BR")}
              </span>

              {action.status === "suggested" && (onApprove || onReject) && (
                <div className="flex items-center gap-2">
                  {onReject && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={onReject}
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Rejeitar
                    </Button>
                  )}
                  {onApprove && (
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-green-600 hover:bg-green-700"
                      onClick={onApprove}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3 mr-1" />
                      )}
                      Aprovar
                    </Button>
                  )}
                </div>
              )}

              {action.status === "approved" && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                  disabled
                >
                  <Play className="h-3 w-3 mr-1" />
                  Executar
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
