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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, LogOut, RefreshCw, Monitor, Clock } from "lucide-react";

export default function AdminOnline() {
  const { data: onlineUsers, isLoading, refetch } = trpc.admin.onlineUsers.list.useQuery(undefined, {
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  const forceLogoutMutation = trpc.admin.onlineUsers.forceLogout.useMutation({
    onSuccess: () => {
      toast.success("Sessão encerrada com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao encerrar sessão");
    },
  });

  const handleForceLogout = (sessionId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja encerrar a sessão de ${userName}?`)) {
      forceLogoutMutation.mutate({ sessionId });
    }
  };

  const formatDuration = (loginAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(loginAt).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-500" />
            Usuários Online
          </h1>
          <p className="text-muted-foreground">
            Monitore os usuários conectados em tempo real
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Usuários Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {onlineUsers?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Última Atualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {new Date().toLocaleTimeString("pt-BR")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atualização Automática
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-500">A cada 30 segundos</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sessões Ativas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Módulo Atual</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Tempo Online</TableHead>
                <TableHead>Última Atividade</TableHead>
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
              ) : onlineUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário online no momento
                  </TableCell>
                </TableRow>
              ) : (
                onlineUsers?.map((session: any) => (
                  <TableRow key={session.sessionId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-medium">{session.userName || "Usuário"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {session.currentModule || "Dashboard"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.ipAddress || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Monitor className="h-4 w-4" />
                        <span className="text-xs truncate max-w-[150px]">
                          {session.userAgent?.split(" ")[0] || "Desconhecido"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatDuration(session.loginAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(session.lastActivityAt).toLocaleTimeString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleForceLogout(session.sessionId, session.userName)}
                        className="text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
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
