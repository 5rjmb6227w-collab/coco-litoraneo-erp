import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ProducaoProblemas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    area: "",
    status: "",
    impact: "",
  });

  const utils = trpc.useUtils();
  const { data: issues = [], isLoading } = trpc.production.issues.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );

  const createMutation = trpc.production.issues.create.useMutation({
    onSuccess: () => {
      toast.success("Problema registrado com sucesso!");
      setIsModalOpen(false);
      utils.production.issues.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao registrar problema: " + error.message);
    },
  });

  const updateMutation = trpc.production.issues.update.useMutation({
    onSuccess: () => {
      toast.success("Problema atualizado!");
      utils.production.issues.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    occurredAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    shift: "manha" as "manha" | "tarde" | "noite",
    area: "producao" as "recepcao" | "producao" | "embalagem" | "expedicao" | "manutencao",
    tags: [] as string[],
    description: "",
    impact: "baixo" as "nenhum" | "baixo" | "medio" | "alto" | "parada_total",
    downtimeMinutes: "",
    actionTaken: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description) {
      toast.error("Descreva o problema");
      return;
    }

    createMutation.mutate({
      occurredAt: formData.occurredAt,
      shift: formData.shift,
      area: formData.area,
      tags: formData.tags.length > 0 ? formData.tags : ["geral"],
      description: formData.description,
      impact: formData.impact,
      downtimeMinutes: formData.downtimeMinutes ? parseInt(formData.downtimeMinutes) : undefined,
      actionTaken: formData.actionTaken || undefined,
    });
  };

  const handleResolve = (id: number, actionTaken: string) => {
    updateMutation.mutate({
      id,
      status: "resolvido",
      actionTaken,
    });
  };

  const exportCSV = () => {
    const headers = ["Data/Hora", "Turno", "Área", "Descrição", "Impacto", "Parada (min)", "Status", "Ação Tomada"];
    const rows = issues.map((i) => [
      format(new Date(i.occurredAt), "dd/MM/yyyy HH:mm"),
      i.shift === "manha" ? "Manhã" : i.shift === "tarde" ? "Tarde" : "Noite",
      areaLabels[i.area],
      i.description,
      impactLabels[i.impact || "baixo"],
      i.downtimeMinutes || "0",
      statusLabels[i.status],
      i.actionTaken || "-",
    ]);

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `problemas_producao_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const areaLabels: Record<string, string> = {
    recepcao: "Recepção",
    producao: "Produção",
    embalagem: "Embalagem",
    expedicao: "Expedição",
    manutencao: "Manutenção",
  };

  const impactLabels: Record<string, string> = {
    nenhum: "Nenhum",
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    parada_total: "Parada Total",
  };

  const statusLabels: Record<string, string> = {
    aberto: "Aberto",
    em_tratamento: "Em Tratamento",
    resolvido: "Resolvido",
  };

  const impactColors: Record<string, string> = {
    nenhum: "bg-gray-100 text-gray-800",
    baixo: "bg-yellow-100 text-yellow-800",
    medio: "bg-orange-100 text-orange-800",
    alto: "bg-red-100 text-red-800",
    parada_total: "bg-red-500 text-white",
  };

  const statusColors: Record<string, string> = {
    aberto: "bg-red-100 text-red-800",
    em_tratamento: "bg-yellow-100 text-yellow-800",
    resolvido: "bg-green-100 text-green-800",
  };

  const tagOptions = [
    "Equipamento",
    "Matéria-prima",
    "Processo",
    "Qualidade",
    "Segurança",
    "Elétrica",
    "Mecânica",
    "Limpeza",
    "Pessoal",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Problemas do Dia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registre ocorrências e problemas na produção
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Problema
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Problema de Produção</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="occurredAt">Data/Hora *</Label>
                    <Input
                      id="occurredAt"
                      type="datetime-local"
                      value={formData.occurredAt}
                      onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift">Turno *</Label>
                    <Select
                      value={formData.shift}
                      onValueChange={(v) => setFormData({ ...formData, shift: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manha">Manhã</SelectItem>
                        <SelectItem value="tarde">Tarde</SelectItem>
                        <SelectItem value="noite">Noite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area">Área *</Label>
                    <Select
                      value={formData.area}
                      onValueChange={(v) => setFormData({ ...formData, area: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recepcao">Recepção</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="embalagem">Embalagem</SelectItem>
                        <SelectItem value="expedicao">Expedição</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="impact">Impacto *</Label>
                    <Select
                      value={formData.impact}
                      onValueChange={(v) => setFormData({ ...formData, impact: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum</SelectItem>
                        <SelectItem value="baixo">Baixo</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="alto">Alto</SelectItem>
                        <SelectItem value="parada_total">Parada Total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => (
                      <Badge
                        key={tag}
                        variant={formData.tags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            tags: formData.tags.includes(tag)
                              ? formData.tags.filter((t) => t !== tag)
                              : [...formData.tags, tag],
                          });
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição do Problema *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Descreva o problema detalhadamente..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="downtimeMinutes">Tempo de Parada (minutos)</Label>
                  <Input
                    id="downtimeMinutes"
                    type="number"
                    value={formData.downtimeMinutes}
                    onChange={(e) => setFormData({ ...formData, downtimeMinutes: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionTaken">Ação Tomada</Label>
                  <Textarea
                    id="actionTaken"
                    value={formData.actionTaken}
                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                    rows={3}
                    placeholder="Descreva a ação tomada para resolver..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Registrar Problema"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select
                value={filters.area}
                onValueChange={(v) => setFilters({ ...filters, area: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="recepcao">Recepção</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="embalagem">Embalagem</SelectItem>
                  <SelectItem value="expedicao">Expedição</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_tratamento">Em Tratamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Impacto</Label>
              <Select
                value={filters.impact}
                onValueChange={(v) => setFilters({ ...filters, impact: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="parada_total">Parada Total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setFilters({ startDate: "", endDate: "", area: "", status: "", impact: "" })}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Impacto</TableHead>
                <TableHead>Parada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum problema registrado
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(issue.occurredAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{areaLabels[issue.area]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={issue.description}>
                      {issue.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(issue.tags as string[])?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {(issue.tags as string[])?.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(issue.tags as string[]).length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={impactColors[issue.impact || "baixo"]}>
                        {impactLabels[issue.impact || "baixo"]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {issue.downtimeMinutes ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {issue.downtimeMinutes} min
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[issue.status]}>
                        {statusLabels[issue.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {issue.status !== "resolvido" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const action = prompt("Descreva a ação tomada para resolver:");
                            if (action) {
                              handleResolve(issue.id, action);
                            }
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolver
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

      {/* Resumo */}
      {issues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Problemas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{issues.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Aberto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {issues.filter((i) => i.status === "aberto").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Resolvidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {issues.filter((i) => i.status === "resolvido").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Total de Parada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {issues.reduce((sum, i) => sum + (i.downtimeMinutes || 0), 0)} min
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
