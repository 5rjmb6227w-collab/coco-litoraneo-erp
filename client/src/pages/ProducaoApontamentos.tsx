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
import { Plus, Download, Factory, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProducaoApontamentos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    shift: "",
    skuId: "",
    variation: "",
  });

  const utils = trpc.useUtils();
  const { data: entries = [], isLoading } = trpc.production.entries.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );
  const { data: skus = [] } = trpc.skus.list.useQuery({});
  const { data: employees = [] } = trpc.employees.list.useQuery({ status: "ativo" });

  const createMutation = trpc.production.entries.create.useMutation({
    onSuccess: () => {
      toast.success("Apontamento registrado com sucesso!");
      setIsModalOpen(false);
      utils.production.entries.list.invalidate();
      utils.skus.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao registrar apontamento: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    productionDate: format(new Date(), "yyyy-MM-dd"),
    shift: "manha" as "manha" | "tarde" | "noite",
    line: "unica" as "linha1" | "linha2" | "unica",
    responsibleId: "",
    responsibleName: "",
    skuId: "",
    variation: "flocos" as "flocos" | "medio" | "fino",
    quantityProduced: "",
    batchNumber: "",
    losses: "",
    lossReason: "" as "" | "processo" | "qualidade" | "equipamento" | "materia_prima" | "outro",
    observations: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.skuId || !formData.quantityProduced || !formData.batchNumber) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      productionDate: formData.productionDate,
      shift: formData.shift,
      line: formData.line,
      responsibleId: formData.responsibleId ? parseInt(formData.responsibleId) : undefined,
      responsibleName: formData.responsibleName || undefined,
      skuId: parseInt(formData.skuId),
      variation: formData.variation,
      quantityProduced: formData.quantityProduced,
      batchNumber: formData.batchNumber,
      losses: formData.losses || undefined,
      lossReason: formData.lossReason || undefined,
      observations: formData.observations || undefined,
    });
  };

  const generateBatchNumber = () => {
    const date = formData.productionDate.replace(/-/g, "");
    const shiftCode = formData.shift === "manha" ? "M" : formData.shift === "tarde" ? "T" : "N";
    const seq = String(entries.length + 1).padStart(3, "0");
    return `${date}-${shiftCode}-${seq}`;
  };

  const exportCSV = () => {
    const headers = ["Data", "Turno", "Linha", "SKU", "Variação", "Quantidade (kg)", "Lote", "Perdas (kg)", "Responsável"];
    const rows = entries.map((e) => {
      const sku = skus.find((s) => s.id === e.skuId);
      return [
        format(new Date(e.productionDate), "dd/MM/yyyy"),
        e.shift === "manha" ? "Manhã" : e.shift === "tarde" ? "Tarde" : "Noite",
        e.line === "linha1" ? "Linha 1" : e.line === "linha2" ? "Linha 2" : "Única",
        sku?.description || "-",
        e.variation === "flocos" ? "Flocos" : e.variation === "medio" ? "Médio" : "Fino",
        e.quantityProduced,
        e.batchNumber,
        e.losses || "0",
        e.responsibleName || "-",
      ];
    });

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `apontamentos_producao_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const shiftLabels = {
    manha: "Manhã",
    tarde: "Tarde",
    noite: "Noite",
  };

  const variationLabels = {
    flocos: "Flocos",
    medio: "Médio",
    fino: "Fino",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Apontamentos de Produção</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registre a produção diária por turno, SKU e variação
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
                Novo Apontamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Apontamento de Produção</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productionDate">Data *</Label>
                    <Input
                      id="productionDate"
                      type="date"
                      value={formData.productionDate}
                      onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
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
                    <Label htmlFor="line">Linha</Label>
                    <Select
                      value={formData.line}
                      onValueChange={(v) => setFormData({ ...formData, line: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unica">Única</SelectItem>
                        <SelectItem value="linha1">Linha 1</SelectItem>
                        <SelectItem value="linha2">Linha 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responsibleName">Responsável</Label>
                    <Input
                      id="responsibleName"
                      value={formData.responsibleName}
                      onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                      placeholder="Nome do responsável"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="skuId">SKU *</Label>
                    <Select
                      value={formData.skuId}
                      onValueChange={(v) => setFormData({ ...formData, skuId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o SKU" />
                      </SelectTrigger>
                      <SelectContent>
                        {skus.filter(s => s.status === "ativo").map((sku) => (
                          <SelectItem key={sku.id} value={sku.id.toString()}>
                            {sku.code} - {sku.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="variation">Variação *</Label>
                    <Select
                      value={formData.variation}
                      onValueChange={(v) => setFormData({ ...formData, variation: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flocos">Flocos</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="fino">Fino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantityProduced">Quantidade Produzida (kg) *</Label>
                    <Input
                      id="quantityProduced"
                      type="number"
                      step="0.01"
                      value={formData.quantityProduced}
                      onChange={(e) => setFormData({ ...formData, quantityProduced: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="batchNumber">Lote *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="batchNumber"
                        value={formData.batchNumber}
                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        placeholder="Ex: 20240103-M-001"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, batchNumber: generateBatchNumber() })}
                      >
                        Gerar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="losses">Perdas (kg)</Label>
                    <Input
                      id="losses"
                      type="number"
                      step="0.01"
                      value={formData.losses}
                      onChange={(e) => setFormData({ ...formData, losses: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lossReason">Motivo da Perda</Label>
                    <Select
                      value={formData.lossReason}
                      onValueChange={(v) => setFormData({ ...formData, lossReason: v as any })}
                      disabled={!formData.losses || parseFloat(formData.losses) <= 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="processo">Processo</SelectItem>
                        <SelectItem value="qualidade">Qualidade</SelectItem>
                        <SelectItem value="equipamento">Equipamento</SelectItem>
                        <SelectItem value="materia_prima">Matéria-prima</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Salvar Apontamento"}
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
              <Label>Turno</Label>
              <Select
                value={filters.shift}
                onValueChange={(v) => setFilters({ ...filters, shift: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noite">Noite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Variação</Label>
              <Select
                value={filters.variation}
                onValueChange={(v) => setFilters({ ...filters, variation: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="flocos">Flocos</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="fino">Fino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setFilters({ startDate: "", endDate: "", shift: "", skuId: "", variation: "" })}
            >
              Limpar Filtros
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
                <TableHead>Turno</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead className="text-right">Quantidade (kg)</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead className="text-right">Perdas (kg)</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Factory className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum apontamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const sku = skus.find((s) => s.id === entry.skuId);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.productionDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {shiftLabels[entry.shift]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {sku?.code || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {variationLabels[entry.variation]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(entry.quantityProduced).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.batchNumber}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.losses && Number(entry.losses) > 0 ? (
                          <span className="text-destructive">
                            {Number(entry.losses).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{entry.responsibleName || "-"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totalizadores */}
      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Produzido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {entries.reduce((sum, e) => sum + Number(e.quantityProduced), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Perdas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {entries.reduce((sum, e) => sum + Number(e.losses || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Apontamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{entries.length}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
