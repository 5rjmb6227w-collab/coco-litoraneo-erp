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
import { Plus, Download, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function QualidadeNaoConformidades() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedNC, setSelectedNC] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: "",
    origin: "",
    area: "",
    startDate: "",
    endDate: "",
  });

  const utils = trpc.useUtils();
  const { data: ncs = [], isLoading } = trpc.quality.nonConformities.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );

  const createMutation = trpc.quality.nonConformities.create.useMutation({
    onSuccess: (data: any) => {
      toast.success(`NC ${data.ncNumber} criada com sucesso!`);
      setIsModalOpen(false);
      utils.quality.nonConformities.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const updateStatusMutation = trpc.quality.nonConformities.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      utils.quality.nonConformities.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    identificationDate: format(new Date(), "yyyy-MM-dd"),
    origin: "processo" as "analise" | "reclamacao_cliente" | "auditoria" | "processo" | "fornecedor",
    area: "producao" as "recepcao" | "producao" | "embalagem" | "expedicao" | "qualidade" | "almoxarifado",
    description: "",
    affectedProduct: "",
    affectedQuantity: "",
    immediateAction: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.identificationDate) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      identificationDate: formData.identificationDate,
      origin: formData.origin,
      area: formData.area,
      description: formData.description,
      affectedProduct: formData.affectedProduct || undefined,
      affectedQuantity: formData.affectedQuantity || undefined,
      immediateAction: formData.immediateAction || undefined,
    });
  };

  const resetForm = () => {
    setFormData({
      identificationDate: format(new Date(), "yyyy-MM-dd"),
      origin: "processo",
      area: "producao",
      description: "",
      affectedProduct: "",
      affectedQuantity: "",
      immediateAction: "",
    });
  };

  const exportCSV = () => {
    const headers = ["Número", "Data", "Origem", "Área", "Descrição", "Status", "Produto Afetado"];
    const rows = ncs.map((nc: any) => [
      nc.ncNumber,
      format(new Date(nc.identificationDate), "dd/MM/yyyy"),
      originLabels[nc.origin],
      areaLabels[nc.area],
      nc.description,
      statusLabels[nc.status],
      nc.affectedProduct || "-",
    ]);

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nao_conformidades_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const originLabels: Record<string, string> = {
    analise: "Análise",
    reclamacao_cliente: "Reclamação Cliente",
    auditoria: "Auditoria",
    processo: "Processo",
    fornecedor: "Fornecedor",
  };

  const areaLabels: Record<string, string> = {
    recepcao: "Recepção",
    producao: "Produção",
    embalagem: "Embalagem",
    expedicao: "Expedição",
    qualidade: "Qualidade",
    almoxarifado: "Almoxarifado",
  };

  const statusLabels: Record<string, string> = {
    aberta: "Aberta",
    em_analise: "Em Análise",
    acao_corretiva: "Ação Corretiva",
    verificacao: "Verificação",
    fechada: "Fechada",
  };

  const statusColors: Record<string, string> = {
    aberta: "bg-red-100 text-red-800",
    em_analise: "bg-yellow-100 text-yellow-800",
    acao_corretiva: "bg-blue-100 text-blue-800",
    verificacao: "bg-purple-100 text-purple-800",
    fechada: "bg-green-100 text-green-800",
  };

  // Estatísticas
  const abertas = ncs.filter((nc: any) => nc.status === "aberta").length;
  const emAnalise = ncs.filter((nc: any) => nc.status === "em_analise").length;
  const emAcao = ncs.filter((nc: any) => nc.status === "acao_corretiva").length;
  const fechadas = ncs.filter((nc: any) => nc.status === "fechada").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Não Conformidades</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as não conformidades identificadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova NC
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Não Conformidade</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Identificação *</Label>
                    <Input
                      type="date"
                      value={formData.identificationDate}
                      onChange={(e) => setFormData({ ...formData, identificationDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Origem *</Label>
                    <Select
                      value={formData.origin}
                      onValueChange={(v) => setFormData({ ...formData, origin: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="processo">Processo</SelectItem>
                        <SelectItem value="analise">Análise</SelectItem>
                        <SelectItem value="reclamacao_cliente">Reclamação Cliente</SelectItem>
                        <SelectItem value="auditoria">Auditoria</SelectItem>
                        <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Área *</Label>
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
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Descrição da NC *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Descreva detalhadamente a não conformidade..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Produto Afetado</Label>
                    <Input
                      value={formData.affectedProduct}
                      onChange={(e) => setFormData({ ...formData, affectedProduct: e.target.value })}
                      placeholder="Ex: Coco Ralado Médio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade Afetada</Label>
                    <Input
                      value={formData.affectedQuantity}
                      onChange={(e) => setFormData({ ...formData, affectedQuantity: e.target.value })}
                      placeholder="Ex: 500 kg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ação Imediata</Label>
                  <Textarea
                    value={formData.immediateAction}
                    onChange={(e) => setFormData({ ...formData, immediateAction: e.target.value })}
                    rows={2}
                    placeholder="Descreva a ação imediata tomada..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Registrar NC"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Abertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{abertas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Em Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{emAnalise}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              Ação Corretiva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{emAcao}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-green-500" />
              Fechadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fechadas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
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
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="acao_corretiva">Ação Corretiva</SelectItem>
                  <SelectItem value="verificacao">Verificação</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select
                value={filters.origin}
                onValueChange={(v) => setFilters({ ...filters, origin: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="processo">Processo</SelectItem>
                  <SelectItem value="analise">Análise</SelectItem>
                  <SelectItem value="reclamacao_cliente">Reclamação Cliente</SelectItem>
                  <SelectItem value="auditoria">Auditoria</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value="qualidade">Qualidade</SelectItem>
                  <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
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
              onClick={() => setFilters({ status: "", origin: "", area: "", startDate: "", endDate: "" })}
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
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : ncs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhuma não conformidade encontrada
                  </TableCell>
                </TableRow>
              ) : (
                ncs.map((nc: any) => (
                  <TableRow key={nc.id}>
                    <TableCell className="font-mono font-medium">{nc.ncNumber}</TableCell>
                    <TableCell>
                      {format(new Date(nc.identificationDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{originLabels[nc.origin]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{areaLabels[nc.area]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={nc.description}>
                      {nc.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[nc.status]}>
                        {statusLabels[nc.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedNC(nc);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da NC {selectedNC?.ncNumber}</DialogTitle>
          </DialogHeader>
          {selectedNC && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">{format(new Date(selectedNC.identificationDate), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusColors[selectedNC.status]}>
                    {statusLabels[selectedNC.status]}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Origem</Label>
                  <p className="font-medium">{originLabels[selectedNC.origin]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Área</Label>
                  <p className="font-medium">{areaLabels[selectedNC.area]}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="font-medium">{selectedNC.description}</p>
              </div>
              {selectedNC.affectedProduct && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Produto Afetado</Label>
                    <p className="font-medium">{selectedNC.affectedProduct}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Quantidade</Label>
                    <p className="font-medium">{selectedNC.affectedQuantity || "-"}</p>
                  </div>
                </div>
              )}
              {selectedNC.immediateAction && (
                <div>
                  <Label className="text-muted-foreground">Ação Imediata</Label>
                  <p className="font-medium">{selectedNC.immediateAction}</p>
                </div>
              )}

              {/* Atualizar Status */}
              {selectedNC.status !== "fechada" && (
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">Atualizar Status</Label>
                  <div className="flex gap-2 mt-2">
                    {selectedNC.status === "aberta" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStatusMutation.mutate({ id: selectedNC.id, status: "em_analise" });
                          setSelectedNC({ ...selectedNC, status: "em_analise" });
                        }}
                      >
                        Iniciar Análise
                      </Button>
                    )}
                    {selectedNC.status === "em_analise" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStatusMutation.mutate({ id: selectedNC.id, status: "acao_corretiva" });
                          setSelectedNC({ ...selectedNC, status: "acao_corretiva" });
                        }}
                      >
                        Definir Ação Corretiva
                      </Button>
                    )}
                    {selectedNC.status === "acao_corretiva" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStatusMutation.mutate({ id: selectedNC.id, status: "verificacao" });
                          setSelectedNC({ ...selectedNC, status: "verificacao" });
                        }}
                      >
                        Enviar para Verificação
                      </Button>
                    )}
                    {selectedNC.status === "verificacao" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStatusMutation.mutate({ id: selectedNC.id, status: "fechada" });
                          setSelectedNC({ ...selectedNC, status: "fechada" });
                        }}
                      >
                        Fechar NC
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
