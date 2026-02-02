import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Receipt, 
  Plus, 
  Pencil, 
  Trash2, 
  Zap,
  Wrench,
  Droplets,
  Flame,
  ShieldCheck,
  Building,
  Shirt,
  TrendingDown,
  MoreHorizontal,
  Calendar,
  Download,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const indirectCostCategories = [
  { value: "energia", label: "Energia Elétrica", icon: Zap, color: "bg-yellow-500" },
  { value: "manutencao", label: "Manutenção", icon: Wrench, color: "bg-orange-500" },
  { value: "limpeza_cip", label: "Limpeza/CIP", icon: Droplets, color: "bg-blue-500" },
  { value: "epis_uniformes", label: "EPIs/Uniformes", icon: Shirt, color: "bg-purple-500" },
  { value: "depreciacao", label: "Depreciação", icon: TrendingDown, color: "bg-gray-500" },
  { value: "aluguel", label: "Aluguel", icon: Building, color: "bg-indigo-500" },
  { value: "agua", label: "Água", icon: Droplets, color: "bg-cyan-500" },
  { value: "gas", label: "Gás", icon: Flame, color: "bg-red-500" },
  { value: "outros", label: "Outros", icon: Receipt, color: "bg-slate-500" },
] as const;

type IndirectCostCategory = typeof indirectCostCategories[number]["value"];

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "default" },
  fechado: { label: "Fechado", variant: "outline" },
};

export default function CustoIndiretos() {
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Period navigation
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Form state
  const [formData, setFormData] = useState({
    category: "energia" as IndirectCostCategory,
    description: "",
    value: "",
    costCenterId: "",
    observations: "",
  });

  // Queries
  const { data: indirectCosts, isLoading, refetch } = trpc.costs.indirectCosts.list.useQuery({
    period: selectedPeriod,
  });

  const { data: costCenters } = trpc.costs.costCenters.list.useQuery({ status: "ativo" });
  const { data: totalsByCategory } = trpc.costs.indirectCosts.getTotalsByCategory.useQuery({ 
    period: selectedPeriod 
  });

  // Mutations
  const utils = trpc.useUtils();

  const createMutation = trpc.costs.indirectCosts.create.useMutation({
    onSuccess: () => {
      toast.success("Custo indireto registrado com sucesso!");
      setShowModal(false);
      resetForm();
      utils.costs.indirectCosts.list.invalidate();
      utils.costs.indirectCosts.getTotalsByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao registrar custo: ${error.message}`);
    },
  });

  const updateMutation = trpc.costs.indirectCosts.update.useMutation({
    onSuccess: () => {
      toast.success("Custo indireto atualizado com sucesso!");
      setShowModal(false);
      setEditingCost(null);
      resetForm();
      utils.costs.indirectCosts.list.invalidate();
      utils.costs.indirectCosts.getTotalsByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar custo: ${error.message}`);
    },
  });

  const deleteMutation = trpc.costs.indirectCosts.delete.useMutation({
    onSuccess: () => {
      toast.success("Custo indireto excluído com sucesso!");
      setDeleteConfirm(null);
      utils.costs.indirectCosts.list.invalidate();
      utils.costs.indirectCosts.getTotalsByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir custo: ${error.message}`);
    },
  });

  const importLaborMutation = trpc.costs.indirectCosts.importLaborCosts.useMutation({
    onSuccess: (data) => {
      toast.success(`Mão de obra importada: ${data.employeeCount} colaboradores, total R$ ${data.totalLaborCost.toFixed(2)}`);
      setShowImportModal(false);
      utils.costs.indirectCosts.list.invalidate();
      utils.costs.indirectCosts.getTotalsByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao importar mão de obra: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      category: "energia",
      description: "",
      value: "",
      costCenterId: "",
      observations: "",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingCost(null);
    setShowModal(true);
  };

  const handleOpenEdit = (cost: any) => {
    setEditingCost(cost);
    setFormData({
      category: cost.category,
      description: cost.description,
      value: cost.value,
      costCenterId: cost.costCenterId?.toString() || "",
      observations: cost.observations || "",
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.description || !formData.value) {
      toast.error("Preencha os campos obrigatórios (descrição e valor)");
      return;
    }

    const value = parseFloat(formData.value);
    if (isNaN(value) || value < 0) {
      toast.error("Valor inválido");
      return;
    }

    if (editingCost) {
      updateMutation.mutate({
        id: editingCost.id,
        category: formData.category,
        description: formData.description,
        value,
        costCenterId: formData.costCenterId && formData.costCenterId !== "none" ? parseInt(formData.costCenterId) : null,
        observations: formData.observations || undefined,
      });
    } else {
      createMutation.mutate({
        period: selectedPeriod,
        category: formData.category,
        description: formData.description,
        value,
        costCenterId: formData.costCenterId && formData.costCenterId !== "none" ? parseInt(formData.costCenterId) : undefined,
        observations: formData.observations || undefined,
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleImportLabor = () => {
    importLaborMutation.mutate({ period: selectedPeriod });
  };

  const handlePreviousPeriod = () => {
    const [year, month] = selectedPeriod.split("-").map(Number);
    const newDate = new Date(year, month - 2, 1);
    setSelectedPeriod(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextPeriod = () => {
    const [year, month] = selectedPeriod.split("-").map(Number);
    const newDate = new Date(year, month, 1);
    setSelectedPeriod(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const getCategoryInfo = (category: string) => {
    return indirectCostCategories.find(c => c.value === category) || indirectCostCategories[8];
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (!num && num !== 0) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Calculate totals
  const totalIndirectCosts = useMemo(() => {
    return indirectCosts?.reduce((sum, cost) => sum + parseFloat(cost.value || "0"), 0) || 0;
  }, [indirectCosts]);

  const costsByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    indirectCosts?.forEach(cost => {
      grouped[cost.category] = (grouped[cost.category] || 0) + parseFloat(cost.value || "0");
    });
    return grouped;
  }, [indirectCosts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-7 w-7 text-primary" />
            Custos Indiretos Mensais
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre e gerencie os custos indiretos de fabricação por período
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)} className="gap-2">
            <Users className="h-4 w-4" />
            Importar Mão de Obra
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Custo
          </Button>
        </div>
      </div>

      {/* Period Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePreviousPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold">{formatPeriod(selectedPeriod)}</span>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalIndirectCosts)}</div>
            <p className="text-xs text-muted-foreground">Total do Período</p>
          </CardContent>
        </Card>
        {indirectCostCategories.slice(0, 4).map(cat => {
          const Icon = cat.icon;
          const value = costsByCategory[cat.value] || 0;
          return (
            <Card key={cat.value}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold">{formatCurrency(value)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{cat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {indirectCostCategories.map(cat => {
              const Icon = cat.icon;
              const value = costsByCategory[cat.value] || 0;
              const percentage = totalIndirectCosts > 0 ? (value / totalIndirectCosts) * 100 : 0;
              return (
                <div key={cat.value} className="text-center p-3 rounded-lg bg-muted/50">
                  <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{formatCurrency(value)}</div>
                  <div className="text-xs text-muted-foreground">{cat.label}</div>
                  <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lançamentos de Custos Indiretos</CardTitle>
          <CardDescription>
            {indirectCosts?.length || 0} lançamento(s) em {formatPeriod(selectedPeriod)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : indirectCosts && indirectCosts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Centro de Custo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indirectCosts.map((cost) => {
                  const catInfo = getCategoryInfo(cost.category);
                  const Icon = catInfo.icon;
                  const statusInfo = statusLabels[cost.status] || statusLabels.rascunho;
                  const costCenter = costCenters?.find(cc => cc.id === cost.costCenterId);
                  return (
                    <TableRow key={cost.id}>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Icon className="h-3 w-3" />
                          {catInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {cost.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {costCenter?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(cost.value)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={cost.status === "fechado"}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(cost)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteConfirm(cost.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum custo indireto registrado para este período</p>
              <Button variant="link" onClick={handleOpenCreate}>
                Registrar primeiro custo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? "Editar Custo Indireto" : "Novo Custo Indireto"}
            </DialogTitle>
            <DialogDescription>
              {editingCost 
                ? "Atualize as informações do custo indireto" 
                : `Registre um novo custo indireto para ${formatPeriod(selectedPeriod)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: IndirectCostCategory) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {indirectCostCategories.map(cat => {
                      const Icon = cat.icon;
                      return (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$) *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                placeholder="Ex: Conta de energia elétrica - Janeiro/2026"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costCenter">Centro de Custo</Label>
              <Select 
                value={formData.costCenterId} 
                onValueChange={(value) => setFormData({ ...formData, costCenterId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {costCenters?.map(cc => (
                    <SelectItem key={cc.id} value={cc.id.toString()}>
                      {cc.code} - {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                placeholder="Observações adicionais..."
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Labor Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Importar Custos de Mão de Obra
            </DialogTitle>
            <DialogDescription>
              Importar automaticamente os custos de mão de obra do módulo de RH para o período {formatPeriod(selectedPeriod)}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm">Esta ação irá:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Buscar todos os colaboradores ativos</li>
                <li>Calcular salários + encargos (FGTS, INSS, férias, 13º, etc.)</li>
                <li>Criar ou atualizar o registro de mão de obra do período</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportLabor}
              disabled={importLaborMutation.isPending}
              className="gap-2"
            >
              {importLaborMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento de custo indireto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
