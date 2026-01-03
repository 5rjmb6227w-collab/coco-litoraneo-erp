import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FileText, Search, Download, Calendar } from "lucide-react";

const MODULES = [
  { value: "recebimento", label: "Recebimento" },
  { value: "produtores", label: "Produtores" },
  { value: "pagamentos", label: "Pagamentos" },
  { value: "almoxarifado", label: "Almoxarifado" },
  { value: "estoque", label: "Estoque" },
  { value: "producao", label: "Produção" },
  { value: "compras", label: "Compras" },
  { value: "financeiro", label: "Financeiro" },
  { value: "qualidade", label: "Qualidade" },
  { value: "rh", label: "RH" },
  { value: "administracao", label: "Administração" },
];

const ACTIONS = [
  { value: "CREATE", label: "Criação" },
  { value: "UPDATE", label: "Atualização" },
  { value: "DELETE", label: "Exclusão" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "ACCESS_DENIED", label: "Acesso Negado" },
  { value: "BLOCK_USER", label: "Bloqueio" },
  { value: "UNBLOCK_USER", label: "Desbloqueio" },
  { value: "FORCE_LOGOUT", label: "Logout Forçado" },
];

export default function AdminLogs() {
  const [filterModule, setFilterModule] = useState<string>("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: logs, isLoading } = trpc.admin.auditLogs.list.useQuery({
    module: filterModule || undefined,
    action: filterAction || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: 100,
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-green-500">Criação</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-500">Atualização</Badge>;
      case "DELETE":
        return <Badge variant="destructive">Exclusão</Badge>;
      case "LOGIN":
        return <Badge className="bg-primary">Login</Badge>;
      case "LOGOUT":
        return <Badge variant="secondary">Logout</Badge>;
      case "ACCESS_DENIED":
        return <Badge variant="destructive">Acesso Negado</Badge>;
      case "BLOCK_USER":
        return <Badge variant="destructive">Bloqueio</Badge>;
      case "UNBLOCK_USER":
        return <Badge className="bg-green-500">Desbloqueio</Badge>;
      case "FORCE_LOGOUT":
        return <Badge variant="destructive">Logout Forçado</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const exportCSV = () => {
    if (!logs || logs.length === 0) return;
    
    const headers = ["Data/Hora", "Usuário", "Ação", "Módulo", "Entidade", "ID", "Campo", "Valor Anterior", "Novo Valor"];
    const rows = logs.map((log: any) => [
      new Date(log.createdAt).toLocaleString("pt-BR"),
      log.userName || "",
      log.action || "",
      log.module || "",
      log.entityType || "",
      log.entityId || "",
      log.fieldName || "",
      log.previousValue || "",
      log.newValue || "",
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_auditoria_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground">
            Histórico completo de todas as ações no sistema
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : logs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.userName || "-"}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.module || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {log.entityType && (
                        <span className="text-sm">
                          {log.entityType}
                          {log.entityId && <span className="text-muted-foreground"> #{log.entityId}</span>}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {log.fieldName && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">{log.fieldName}: </span>
                          {log.previousValue && (
                            <span className="line-through text-destructive">{log.previousValue}</span>
                          )}
                          {log.previousValue && log.newValue && " → "}
                          {log.newValue && (
                            <span className="text-green-600">{log.newValue}</span>
                          )}
                        </div>
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
