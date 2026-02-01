import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Download, PackageCheck, Eye, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Pencil } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = [
  { value: "seco", label: "Coco Ralado Seco" },
  { value: "umido", label: "Coco Úmido" },
  { value: "adocado", label: "Coco Adoçado" },
];

const VARIATIONS = [
  { value: "flocos", label: "Flocos" },
  { value: "medio", label: "Médio" },
  { value: "fino", label: "Fino" },
];

export default function EstoqueProdutoAcabado() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Auth para verificar permissões
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'gerente' || user?.role === 'ceo';

  // Form state para edição
  const [editFormData, setEditFormData] = useState({
    code: "",
    description: "",
    externalCode: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showBelowMinimum, setShowBelowMinimum] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    category: "" as "" | "seco" | "umido" | "adocado",
    variation: "" as "" | "flocos" | "medio" | "fino",
    packageWeight: "",
    packageType: "",
    minimumStock: "",
    shelfLifeDays: "180",
    suggestedPrice: "",
    externalCode: "",
  });

  // Movement form state
  const [movementData, setMovementData] = useState({
    movementType: "entrada" as "entrada" | "saida" | "ajuste",
    quantity: "",
    batchNumber: "",
    reason: "",
    observations: "",
  });

  // Queries
  const { data: items, refetch } = trpc.skus.list.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: searchTerm || undefined,
    belowMinimum: showBelowMinimum || undefined,
  });

  // Mutations
  const createMutation = trpc.skus.create.useMutation({
    onSuccess: () => {
      toast.success("SKU cadastrado com sucesso!");
      setIsModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar SKU: " + error.message);
    },
  });

  const movementMutation = trpc.finishedGoods.createMovement.useMutation({
    onSuccess: () => {
      toast.success("Movimentação registrada com sucesso!");
      setIsMovementModalOpen(false);
      resetMovementForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar movimentação: " + error.message);
    },
  });

  const updateMutation = trpc.skus.update.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso!");
      setIsEditModalOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const openEditModal = (item: any) => {
    setSelectedItem(item);
    setEditFormData({
      code: item.code || "",
      description: item.description || "",
      externalCode: item.externalCode || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedItem || !editFormData.code || !editFormData.description) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    updateMutation.mutate({
      id: selectedItem.id,
      code: editFormData.code,
      description: editFormData.description,
      externalCode: editFormData.externalCode || undefined,
    });
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      category: "",
      variation: "",
      packageWeight: "",
      packageType: "",
      minimumStock: "",
      shelfLifeDays: "180",
      suggestedPrice: "",
      externalCode: "",
    });
  };

  const resetMovementForm = () => {
    setMovementData({
      movementType: "entrada",
      quantity: "",
      batchNumber: "",
      reason: "",
      observations: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.description || !formData.category || !formData.variation || !formData.packageWeight || !formData.minimumStock) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      code: formData.code,
      description: formData.description,
      category: formData.category as "seco" | "umido" | "adocado",
      variation: formData.variation as "flocos" | "medio" | "fino",
      packageWeight: formData.packageWeight,
      packageType: formData.packageType || undefined,
      minimumStock: formData.minimumStock,
      shelfLifeDays: parseInt(formData.shelfLifeDays),
      suggestedPrice: formData.suggestedPrice || undefined,
      externalCode: formData.externalCode || undefined,
    });
  };

  const handleMovement = () => {
    if (!selectedItem || !movementData.quantity || !movementData.reason) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    movementMutation.mutate({
      skuId: selectedItem.id,
      movementType: movementData.movementType,
      quantity: movementData.quantity,
      batchNumber: movementData.batchNumber || undefined,
      reason: movementData.reason,
      observations: movementData.observations || undefined,
    });
  };

  const openViewModal = (item: any) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  const openMovementModal = (item: any, type: "entrada" | "saida") => {
    setSelectedItem(item);
    const today = new Date();
    setMovementData({
      movementType: type,
      quantity: "",
      batchNumber: type === "entrada" ? `L${format(today, "yyyyMMdd")}` : "",
      reason: "",
      observations: "",
    });
    setIsMovementModalOpen(true);
  };

  const getStockStatus = (current: string, minimum: string) => {
    const curr = Number(current);
    const min = Number(minimum);
    if (curr <= 0) return "critical";
    if (curr < min) return "low";
    if (curr < min * 1.5) return "warning";
    return "ok";
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive">Zerado</Badge>;
      case "low":
        return <Badge variant="destructive">Crítico</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500">Baixo</Badge>;
      default:
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">OK</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const getVariationLabel = (variation: string) => {
    return VARIATIONS.find(v => v.value === variation)?.label || variation;
  };

  const exportCSV = () => {
    if (!items || items.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = ["company_code", "entity_id", "external_code", "codigo", "descricao", "categoria", "variacao", "peso_embalagem", "estoque_atual", "estoque_minimo", "validade_dias", "status"];
    const rows = items.map((item: any) => [
      "COCO_LITORANEO",
      item.id,
      item.externalCode || "",
      item.code,
      item.description,
      item.category,
      item.variation,
      item.packageWeight,
      item.currentStock,
      item.minimumStock,
      item.shelfLifeDays,
      item.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `estoque_produto_acabado_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Arquivo exportado com sucesso!");
  };

  // Auto-generate code when category, variation, or package weight changes
  const generateCode = (cat: string, vari: string, weight: string) => {
    if (!cat || !vari || !weight) return "";
    const catCode = cat === "seco" ? "CRS" : cat === "umido" ? "CRU" : "CRA";
    const varCode = vari === "flocos" ? "FL" : vari === "medio" ? "MD" : "FN";
    return `${catCode}-${varCode}-${weight}KG`;
  };

  const handleCategoryChange = (value: "seco" | "umido" | "adocado") => {
    const newCode = generateCode(value, formData.variation, formData.packageWeight);
    setFormData(prev => ({
      ...prev,
      category: value,
      code: newCode || prev.code,
    }));
  };

  const handleVariationChange = (value: "flocos" | "medio" | "fino") => {
    const newCode = generateCode(formData.category, value, formData.packageWeight);
    setFormData(prev => ({
      ...prev,
      variation: value,
      code: newCode || prev.code,
    }));
  };

  const handleWeightChange = (value: string) => {
    const newCode = generateCode(formData.category, formData.variation, value);
    setFormData(prev => ({
      ...prev,
      packageWeight: value,
      code: newCode || prev.code,
      description: formData.category && formData.variation 
        ? `${getCategoryLabel(formData.category)} ${getVariationLabel(formData.variation)} ${value}kg`
        : prev.description,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estoque de Produto Acabado</h1>
          <p className="text-muted-foreground">Gerencie o estoque de produtos finalizados por SKU</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo SKU
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showBelowMinimum ? "default" : "outline"}
              onClick={() => setShowBelowMinimum(!showBelowMinimum)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Abaixo do Mínimo
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Produtos Acabados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Variação</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items && items.length > 0 ? (
                  items.map((item: any) => {
                    const stockStatus = getStockStatus(item.currentStock, item.minimumStock);
                    return (
                      <TableRow key={item.id} className={stockStatus === "critical" || stockStatus === "low" ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono font-medium">{item.code}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
                        </TableCell>
                        <TableCell>{getVariationLabel(item.variation)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(item.currentStock).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {Number(item.minimumStock).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                        </TableCell>
                        <TableCell>{getStockBadge(stockStatus)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMovementModal(item, "entrada")}
                              title="Entrada"
                            >
                              <ArrowDownCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openMovementModal(item, "saida")}
                              title="Saída"
                            >
                              <ArrowUpCircle className="h-4 w-4 text-red-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewModal(item)}
                              title="Detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum SKU cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Novo SKU */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo SKU de Produto Acabado</DialogTitle>
            <DialogDescription>
              Cadastre um novo produto acabado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="variation">Variação *</Label>
                <Select
                  value={formData.variation}
                  onValueChange={handleVariationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIATIONS.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packageWeight">Peso Embalagem (kg) *</Label>
                <Select
                  value={formData.packageWeight}
                  onValueChange={handleWeightChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 kg</SelectItem>
                    <SelectItem value="5">5 kg</SelectItem>
                    <SelectItem value="10">10 kg</SelectItem>
                    <SelectItem value="25">25 kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código (gerado)</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="CRS-FL-5KG"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                placeholder="Nome completo do produto"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shelfLifeDays">Validade (dias)</Label>
                <Input
                  id="shelfLifeDays"
                  type="number"
                  value={formData.shelfLifeDays}
                  onChange={(e) => setFormData({ ...formData, shelfLifeDays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumStock">Estoque Mínimo (kg) *</Label>
                <Input
                  id="minimumStock"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.minimumStock}
                  onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packageType">Tipo de Embalagem</Label>
                <Input
                  id="packageType"
                  placeholder="Ex: Saco Kraft"
                  value={formData.packageType}
                  onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suggestedPrice">Preço Sugerido (R$)</Label>
                <Input
                  id="suggestedPrice"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.suggestedPrice}
                  onChange={(e) => setFormData({ ...formData, suggestedPrice: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="externalCode">Código Externo (ERP)</Label>
              <Input
                id="externalCode"
                placeholder="Código para integração"
                value={formData.externalCode}
                onChange={(e) => setFormData({ ...formData, externalCode: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Cadastrar SKU"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar SKU */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Produto</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Código</Label>
                  <p className="font-mono font-medium text-lg">{selectedItem.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Categoria</Label>
                  <p className="font-medium">{getCategoryLabel(selectedItem.category)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="font-medium">{selectedItem.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Variação</Label>
                  <p className="font-medium">{getVariationLabel(selectedItem.variation)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Embalagem</Label>
                  <p className="font-medium">{selectedItem.packageWeight} kg</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Validade</Label>
                  <p className="font-medium">{selectedItem.shelfLifeDays} dias</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground">Estoque Atual</Label>
                  <p className="font-mono text-lg font-bold">
                    {Number(selectedItem.currentStock).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estoque Mínimo</Label>
                  <p className="font-mono text-lg">
                    {Number(selectedItem.minimumStock).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                  </p>
                </div>
              </div>
              {selectedItem.suggestedPrice && (
                <div>
                  <Label className="text-muted-foreground">Preço Sugerido</Label>
                  <p className="font-mono font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(selectedItem.suggestedPrice))}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <div>
              {canEdit && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(selectedItem);
                  }}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edição de Produto */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Altere as informações do produto acabado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editCode">Código *</Label>
              <Input
                id="editCode"
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                placeholder="CRS-FL-5KG"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Descrição *</Label>
              <Input
                id="editDescription"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Coco Ralado Seco - Flocos 5kg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editExternalCode">Código Externo (ERP)</Label>
              <Input
                id="editExternalCode"
                value={editFormData.externalCode}
                onChange={(e) => setEditFormData({ ...editFormData, externalCode: e.target.value })}
                placeholder="Código para integração"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Movimentação */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {movementData.movementType === "entrada" ? "Entrada de Produção" : "Saída de Estoque"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground">Estoque Atual</Label>
              <p className="font-mono text-lg font-bold">
                {selectedItem && Number(selectedItem.currentStock).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade (kg) *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={movementData.quantity}
                onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
              />
            </div>

            {movementData.movementType === "entrada" && (
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Número do Lote</Label>
                <Input
                  id="batchNumber"
                  placeholder="L20240103"
                  value={movementData.batchNumber}
                  onChange={(e) => setMovementData({ ...movementData, batchNumber: e.target.value.toUpperCase() })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Select
                value={movementData.reason}
                onValueChange={(value) => setMovementData({ ...movementData, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {movementData.movementType === "entrada" ? (
                    <>
                      <SelectItem value="Produção">Produção</SelectItem>
                      <SelectItem value="Devolução Cliente">Devolução Cliente</SelectItem>
                      <SelectItem value="Ajuste de Inventário">Ajuste de Inventário</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Venda">Venda</SelectItem>
                      <SelectItem value="Amostra">Amostra</SelectItem>
                      <SelectItem value="Perda/Avaria">Perda/Avaria</SelectItem>
                      <SelectItem value="Vencido">Vencido</SelectItem>
                      <SelectItem value="Ajuste de Inventário">Ajuste de Inventário</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                placeholder="Observações adicionais..."
                value={movementData.observations}
                onChange={(e) => setMovementData({ ...movementData, observations: e.target.value })}
              />
            </div>

            {movementData.quantity && (
              <div className="p-4 bg-primary/5 rounded-lg">
                <Label className="text-muted-foreground">Novo Estoque</Label>
                <p className="font-mono text-lg font-bold text-primary">
                  {selectedItem && (
                    movementData.movementType === "entrada"
                      ? (Number(selectedItem.currentStock) + Number(movementData.quantity)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                      : (Number(selectedItem.currentStock) - Number(movementData.quantity)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                  )} kg
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsMovementModalOpen(false); resetMovementForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleMovement}
              disabled={movementMutation.isPending}
              className={movementData.movementType === "entrada" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {movementMutation.isPending ? "Salvando..." : movementData.movementType === "entrada" ? "Registrar Entrada" : "Registrar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
