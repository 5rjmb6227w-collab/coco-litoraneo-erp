import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, CheckCircle, AlertTriangle, ShieldAlert, RefreshCw } from "lucide-react";
import { useState } from "react";

const PRIORITIES = [
  { value: "critica", label: "Crítica", color: "bg-red-600" },
  { value: "alta", label: "Alta", color: "bg-orange-500" },
  { value: "media", label: "Média", color: "bg-yellow-500" },
  { value: "baixa", label: "Baixa", color: "bg-blue-500" },
];

const ALERT_TYPES = [
  { value: "login_falho", label: "Login Falho" },
  { value: "login_bloqueado", label: "Login Bloqueado" },
  { value: "acesso_negado", label: "Acesso Negado" },
  { value: "sessao_expirada", label: "Sessão Expirada" },
  { value: "alteracao_permissao", label: "Alteração de Permissão" },
  { value: "tentativa_invasao", label: "Tentativa de Invasão" },
];

export default function AdminAlertas() {
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterRead, setFilterRead] = useState<string>("");

  const { data: alerts, isLoading, refetch } = trpc.admin.securityAlerts.list.useQuery({
    priority: filterPriority || undefined,
    isRead: filterRead === "lidos" ? true : filterRead === "nao_lidos" ? false : undefined,
    limit: 100,
  });

  const { data: unreadCount } = trpc.admin.securityAlerts.unreadCount.useQuery();

  const markAsReadMutation = trpc.admin.securityAlerts.markAsRead.useMutation({
    onSuccess: () => {
      toast.success("Alerta marcado como lido");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao marcar alerta");
    },
  });

  const handleMarkAsRead = (alertId: number) => {
    markAsReadMutation.mutate({ id: alertId });
  };

  const getPriorityBadge = (priority: string) => {
    const p = PRIORITIES.find(pr => pr.value === priority);
    return <Badge className={p?.color || "bg-gray-500"}>{p?.label || priority}</Badge>;
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "login_falho":
      case "login_bloqueado":
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case "acesso_negado":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "tentativa_invasao":
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Alertas de Segurança
            {unreadCount && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} não lidos
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Monitore eventos de segurança e atividades suspeitas
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {PRIORITIES.map((p) => {
          const count = alerts?.filter((a: any) => a.priority === p.value && !a.isRead).length || 0;
          return (
            <Card key={p.value}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {p.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${count > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {count}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="nao_lidos">Não Lidos</SelectItem>
                <SelectItem value="lidos">Lidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : alerts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum alerta encontrado
                  </TableCell>
                </TableRow>
              ) : (
                alerts?.map((alert: any) => (
                  <TableRow key={alert.id} className={!alert.isRead ? "bg-muted/30" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getAlertTypeIcon(alert.alertType)}
                        <span className="text-sm">
                          {ALERT_TYPES.find(t => t.value === alert.alertType)?.label || alert.alertType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(alert.priority)}</TableCell>
                    <TableCell className="max-w-[250px]">
                      <p className="text-sm truncate">{alert.description}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {alert.userId || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {alert.ipAddress || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(alert.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(alert.id)}
                          className="text-green-600"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
