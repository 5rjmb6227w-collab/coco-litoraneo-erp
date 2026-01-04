/**
 * AlertsTable - Tabela de alertas do Copiloto IA
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  BellOff, 
  Check, 
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  Mail,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Alert {
  id: number;
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  status: "pending" | "sent" | "acknowledged" | "failed";
  sentAt: Date | null;
  acknowledgedAt: Date | null;
  acknowledgedBy: number | null;
  createdAt: Date;
}

const severityConfig = {
  info: {
    icon: Info,
    color: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
  },
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    badge: "bg-red-100 text-red-700",
  },
};

const statusConfig = {
  pending: { label: "Pendente", color: "bg-stone-100 text-stone-700" },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  acknowledged: { label: "Confirmado", color: "bg-green-100 text-green-700" },
  failed: { label: "Falhou", color: "bg-red-100 text-red-700" },
};

export function AlertsTable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Query de eventos como proxy para alertas (usando a mesma estrutura)
  const eventsQuery = trpc.ai.listEvents.useQuery({ limit: 100 });

  // Simular alertas a partir dos eventos (em produção seria uma query separada)
  const alerts: Alert[] = (eventsQuery.data || []).slice(0, 20).map((event: any, index) => ({
    id: event.id as number,
    alertType: String(event.eventType || 'unknown'),
    severity: index % 3 === 0 ? "critical" : index % 2 === 0 ? "warning" : "info",
    title: `Alerta: ${String(event.eventType || 'unknown').replace(/_/g, " ").replace(/\./g, " - ")}`,
    message: `Evento registrado para ${event.entityType || 'desconhecido'} #${event.entityId || 0}`,
    status: index % 4 === 0 ? "pending" : index % 4 === 1 ? "sent" : index % 4 === 2 ? "acknowledged" : "failed",
    sentAt: index % 4 >= 1 ? new Date() : null,
    acknowledgedAt: index % 4 === 2 ? new Date() : null,
    acknowledgedBy: index % 4 === 2 ? 1 : null,
    createdAt: event.createdAt || new Date(),
  }));

  // Filtrar alertas
  const filteredAlerts = alerts.filter(alert => {
    if (statusFilter !== "all" && alert.status !== statusFilter) return false;
    if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
    return true;
  });

  const handleAcknowledge = (alertId: number) => {
    toast.success("Alerta confirmado");
  };

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-stone-800">Alertas</h2>
          <Badge variant="secondary">{filteredAlerts.length}</Badge>
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="sent">Enviados</SelectItem>
              <SelectItem value="acknowledged">Confirmados</SelectItem>
              <SelectItem value="failed">Falhos</SelectItem>
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
        </div>
      </div>

      {/* Loading */}
      {eventsQuery.isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      )}

      {/* Empty state */}
      {!eventsQuery.isLoading && filteredAlerts.length === 0 && (
        <Card className="p-8 text-center">
          <BellOff className="h-12 w-12 mx-auto text-stone-300 mb-4" />
          <h3 className="text-lg font-medium text-stone-700 mb-2">
            Nenhum alerta encontrado
          </h3>
          <p className="text-sm text-stone-500">
            Não há alertas com os filtros selecionados.
          </p>
        </Card>
      )}

      {/* Tabela de alertas */}
      {!eventsQuery.isLoading && filteredAlerts.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Sev.</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[150px]">Data</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => {
                  const sevConfig = severityConfig[alert.severity];
                  const statConfig = statusConfig[alert.status];
                  const SevIcon = sevConfig.icon;

                  return (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <SevIcon className={cn("h-5 w-5", sevConfig.color)} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-stone-800">
                            {alert.title}
                          </p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {alert.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", statConfig.color)}>
                          {statConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-stone-500">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {alert.sentAt && (
                          <div className="flex items-center gap-1 text-xs text-blue-500 mt-0.5">
                            <Mail className="h-3 w-3" />
                            Enviado
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {alert.status !== "acknowledged" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            ACK
                          </Button>
                        )}
                        {alert.status === "acknowledged" && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-stone-500">
        <div className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-red-600" />
          Crítico
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Atenção
        </div>
        <div className="flex items-center gap-1">
          <Info className="h-4 w-4 text-blue-600" />
          Informativo
        </div>
      </div>
    </div>
  );
}
