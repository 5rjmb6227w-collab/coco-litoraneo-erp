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
import { Plus, Download, FlaskConical, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function QualidadeAnalises() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    analysisType: "",
    result: "",
    startDate: "",
    endDate: "",
  });

  const utils = trpc.useUtils();
  const { data: analyses = [], isLoading } = trpc.quality.analyses.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );
  const { data: skus = [] } = trpc.skus.list.useQuery({});
  const { data: stats } = trpc.quality.stats.useQuery({ months: 6 });

  const createMutation = trpc.quality.analyses.create.useMutation({
    onSuccess: () => {
      toast.success("Análise registrada com sucesso!");
      setIsModalOpen(false);
      utils.quality.analyses.list.invalidate();
      utils.quality.stats.invalidate();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    analysisDate: format(new Date(), "yyyy-MM-dd"),
    analysisType: "fisico_quimica" as "microbiologica" | "fisico_quimica" | "sensorial" | "outra",
    relatedTo: "nenhum" as "carga_coco" | "lote_producao" | "nenhum",
    referenceId: "",
    skuId: "",
    batchNumber: "",
    parameters: "",
    results: "",
    specificationLimits: "",
    result: "pendente" as "conforme" | "nao_conforme" | "pendente",
    responsibleName: "",
    observations: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.parameters || !formData.results) {
      toast.error("Preencha os parâmetros e resultados");
      return;
    }

    createMutation.mutate({
      analysisDate: formData.analysisDate,
      analysisType: formData.analysisType,
      relatedTo: formData.relatedTo,
      referenceId: formData.referenceId ? parseInt(formData.referenceId) : undefined,
      skuId: formData.skuId ? parseInt(formData.skuId) : undefined,
      batchNumber: formData.batchNumber || undefined,
      parameters: formData.parameters,
      results: formData.results,
      specificationLimits: formData.specificationLimits || undefined,
      result: formData.result,
      responsibleName: formData.responsibleName || undefined,
      observations: formData.observations || undefined,
    });
  };

  const exportCSV = () => {
    const headers = ["Data", "Tipo", "SKU", "Lote", "Parâmetros", "Resultados", "Resultado", "Responsável"];
    const rows = analyses.map((a) => {
      const sku = skus.find((s) => s.id === a.skuId);
      return [
        format(new Date(a.analysisDate), "dd/MM/yyyy"),
        typeLabels[a.analysisType],
        sku?.code || "-",
        a.batchNumber || "-",
        a.parameters,
        a.results,
        resultLabels[a.result],
        a.responsibleName || "-",
      ];
    });

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analises_qualidade_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const typeLabels: Record<string, string> = {
    microbiologica: "Microbiológica",
    fisico_quimica: "Físico-Química",
    sensorial: "Sensorial",
    outra: "Outra",
  };

  const resultLabels: Record<string, string> = {
    conforme: "Conforme",
    nao_conforme: "Não Conforme",
    pendente: "Pendente",
  };

  const resultColors: Record<string, string> = {
    conforme: "bg-green-100 text-green-800",
    nao_conforme: "bg-red-100 text-red-800",
    pendente: "bg-yellow-100 text-yellow-800",
  };

  const resultIcons: Record<string, any> = {
    conforme: CheckCircle,
    nao_conforme: XCircle,
    pendente: Clock,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Análises de Qualidade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registre e acompanhe análises laboratoriais
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Análise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Análise de Qualidade</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data da Análise *</Label>
                    <Input
                      type="date"
                      value={formData.analysisDate}
                      onChange={(e) => setFormData({ ...formData, analysisDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Análise *</Label>
                    <Select
                      value={formData.analysisType}
                      onValueChange={(v) => setFormData({ ...formData, analysisType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="microbiologica">Microbiológica</SelectItem>
                        <SelectItem value="fisico_quimica">Físico-Química</SelectItem>
                        <SelectItem value="sensorial">Sensorial</SelectItem>
                        <SelectItem value="outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU (Produto)</Label>
                    <Select
                      value={formData.skuId}
                      onValueChange={(v) => setFormData({ ...formData, skuId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {skus.map((sku) => (
                          <SelectItem key={sku.id} value={sku.id.toString()}>
                            {sku.code} - {sku.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Número do Lote</Label>
                    <Input
                      value={formData.batchNumber}
                      onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                      placeholder="Ex: 20240103-M-001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Parâmetros Analisados *</Label>
                  <Textarea
                    value={formData.parameters}
                    onChange={(e) => setFormData({ ...formData, parameters: e.target.value })}
                    rows={3}
                    placeholder="Ex: Umidade, pH, Acidez, Coliformes..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Resultados *</Label>
                  <Textarea
                    value={formData.results}
                    onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                    rows={3}
                    placeholder="Ex: Umidade: 3.2%, pH: 6.5, Acidez: 0.8%..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Limites de Especificação</Label>
                  <Textarea
                    value={formData.specificationLimits}
                    onChange={(e) => setFormData({ ...formData, specificationLimits: e.target.value })}
                    rows={2}
                    placeholder="Ex: Umidade: máx 5%, pH: 5.5-7.0..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Resultado Final *</Label>
                    <Select
                      value={formData.result}
                      onValueChange={(v) => setFormData({ ...formData, result: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conforme">Conforme</SelectItem>
                        <SelectItem value="nao_conforme">Não Conforme</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Input
                      value={formData.responsibleName}
                      onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                      placeholder="Nome do analista"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Registrar Análise"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                NCs por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.ncsByMonth?.length || 0}</p>
              <p className="text-xs text-muted-foreground">meses com registros</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Total de NCs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.ncsByMonth?.reduce((acc: number, m: any) => acc + (Number(m.count) || 0), 0) || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Origens Distintas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.ncsByOrigin?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                Taxa Conformidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.conformityRate?.length > 0 
                  ? ((stats.conformityRate.reduce((acc: number, m: any) => acc + (Number(m.conformes) || 0), 0) / 
                     stats.conformityRate.reduce((acc: number, m: any) => acc + (Number(m.total) || 0), 0)) * 100).toFixed(1)
                  : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={filters.analysisType}
                onValueChange={(v) => setFilters({ ...filters, analysisType: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="microbiologica">Microbiológica</SelectItem>
                  <SelectItem value="fisico_quimica">Físico-Química</SelectItem>
                  <SelectItem value="sensorial">Sensorial</SelectItem>
                  <SelectItem value="outra">Outra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select
                value={filters.result}
                onValueChange={(v) => setFilters({ ...filters, result: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="conforme">Conforme</SelectItem>
                  <SelectItem value="nao_conforme">Não Conforme</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button
              variant="outline"
              onClick={() => setFilters({ analysisType: "", result: "", startDate: "", endDate: "" })}
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
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Parâmetros</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : analyses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhuma análise encontrada
                  </TableCell>
                </TableRow>
              ) : (
                analyses.map((analysis) => {
                  const sku = skus.find((s) => s.id === analysis.skuId);
                  const ResultIcon = resultIcons[analysis.result];
                  return (
                    <TableRow key={analysis.id}>
                      <TableCell>
                        {format(new Date(analysis.analysisDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeLabels[analysis.analysisType]}</Badge>
                      </TableCell>
                      <TableCell>{sku?.code || "-"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {analysis.batchNumber || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={analysis.parameters}>
                        {analysis.parameters}
                      </TableCell>
                      <TableCell>
                        <Badge className={resultColors[analysis.result]}>
                          <ResultIcon className="h-3 w-3 mr-1" />
                          {resultLabels[analysis.result]}
                        </Badge>
                      </TableCell>
                      <TableCell>{analysis.responsibleName || "-"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
