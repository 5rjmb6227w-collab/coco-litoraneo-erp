import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { 
  Search, 
  Plus, 
  Package,
  Layers,
  DollarSign,
  Scale,
  AlertTriangle,
  ChevronRight,
  Edit,
  Trash2,
  Calculator,
  FileText,
  Check,
  Copy
} from "lucide-react";

export default function BOMReceitas() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedSku, setSelectedSku] = useState<any>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetSkuId, setTargetSkuId] = useState<string>("");
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    itemId: "",
    itemType: "materia_prima" as "materia_prima" | "embalagem" | "insumo",
    quantityPerUnit: "",
    unit: "kg",
    wastagePercent: "0",
    isOptional: false,
    observations: "",
  });
  
  // Queries
  const { data: skus, isLoading: loadingSkus } = trpc.skus.list.useQuery({});
  const { data: warehouseItems } = trpc.warehouseItems.list.useQuery({ warehouseType: "producao" });
  const { data: bomItems, refetch: refetchBom } = trpc.bom.listBySkuId.useQuery(
    { skuId: selectedSku?.id || 0 },
    { enabled: !!selectedSku }
  );
  
  // Mutations
  const createMutation = trpc.bom.create.useMutation({
    onSuccess: () => {
      toast.success("Ingrediente adicionado com sucesso!");
      setIsAddItemOpen(false);
      resetForm();
      refetchBom();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar ingrediente: " + error.message);
    },
  });
  
  const updateMutation = trpc.bom.update.useMutation({
    onSuccess: () => {
      toast.success("Ingrediente atualizado com sucesso!");
      setIsEditItemOpen(false);
      setEditingItem(null);
      resetForm();
      refetchBom();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar ingrediente: " + error.message);
    },
  });
  
  const deleteMutation = trpc.bom.delete.useMutation({
    onSuccess: () => {
      toast.success("Ingrediente removido com sucesso!");
      refetchBom();
    },
    onError: (error) => {
      toast.error("Erro ao remover ingrediente: " + error.message);
    },
  });
  
  const copyMutation = trpc.bom.copyToSku.useMutation({
    onSuccess: (data) => {
      toast.success(`BOM copiada com sucesso! ${data.copiedItems} itens copiados.`);
      setIsCopyModalOpen(false);
      setTargetSkuId("");
    },
    onError: (error) => {
      toast.error("Erro ao copiar BOM: " + error.message);
    },
  });
  
  // Verifica se usuário pode editar (admin, gerente ou ceo)
  const canEdit = user?.role === "admin" || user?.role === "gerente" || user?.role === "ceo";
  
  // Filtrar SKUs
  const filteredSkus = skus?.filter((sku: any) => 
    !search || 
    sku.code.toLowerCase().includes(search.toLowerCase()) ||
    sku.description.toLowerCase().includes(search.toLowerCase())
  );
  
  const resetForm = () => {
    setFormData({
      itemId: "",
      itemType: "materia_prima",
      quantityPerUnit: "",
      unit: "kg",
      wastagePercent: "0",
      isOptional: false,
      observations: "",
    });
  };
  
  const calculateTotalCost = (items: any[]) => {
    if (!items || !warehouseItems) return 0;
    return items.reduce((total, item) => {
      // Custo unitário padrão (pode ser configurado por item no futuro)
      const unitCost = 1.00; // R$ 1,00 por unidade como placeholder
      const quantity = parseFloat(item.quantityPerUnit) || 0;
      return total + (quantity * unitCost);
    }, 0);
  };
  
  const getItemAvailability = (itemId: number) => {
    const warehouseItem = warehouseItems?.find((wi: any) => wi.id === itemId);
    if (!warehouseItem) return { available: false, stock: 0 };
    return {
      available: parseFloat(warehouseItem.currentStock) > 0,
      stock: parseFloat(warehouseItem.currentStock),
    };
  };
  
  const handleAddItem = () => {
    if (!selectedSku || !formData.itemId) {
      toast.error("Selecione um item do almoxarifado");
      return;
    }
    
    const warehouseItem = warehouseItems?.find((wi: any) => wi.id === parseInt(formData.itemId));
    if (!warehouseItem) {
      toast.error("Item não encontrado");
      return;
    }
    
    createMutation.mutate({
      skuId: selectedSku.id,
      itemId: parseInt(formData.itemId),
      itemType: formData.itemType,
      itemName: warehouseItem.name,
      quantityPerUnit: formData.quantityPerUnit,
      unit: formData.unit,
      wastagePercent: formData.wastagePercent,
      isOptional: formData.isOptional,
      observations: formData.observations,
    });
  };
  
  const handleUpdateItem = () => {
    if (!editingItem) return;
    
    updateMutation.mutate({
      id: editingItem.id,
      quantityPerUnit: formData.quantityPerUnit,
      unit: formData.unit,
      wastagePercent: formData.wastagePercent,
      isOptional: formData.isOptional,
      observations: formData.observations,
    });
  };
  
  const handleDeleteItem = (itemId: number) => {
    if (confirm("Tem certeza que deseja remover este ingrediente?")) {
      deleteMutation.mutate({ id: itemId });
    }
  };
  
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      itemId: String(item.itemId),
      itemType: item.itemType,
      quantityPerUnit: item.quantityPerUnit,
      unit: item.unit,
      wastagePercent: item.wastagePercent || "0",
      isOptional: item.isOptional || false,
      observations: item.observations || "",
    });
    setIsEditItemOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BOM / Receitas</h1>
            <p className="text-muted-foreground">
              Gestão de Bill of Materials e receitas de produção
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto por código ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Products List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-400" />
              Produtos (SKUs)
            </h2>
            
            {loadingSkus ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-slate-700 rounded w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSkus && filteredSkus.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredSkus.map((sku: any) => {
                  const isSelected = selectedSku?.id === sku.id;
                  const skuBomItems = isSelected ? bomItems : [];
                  const totalCost = calculateTotalCost(skuBomItems || []);
                  const hasUnavailable = (skuBomItems || []).some((item: any) => !getItemAvailability(item.itemId).available);
                  
                  return (
                    <Card 
                      key={sku.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        isSelected 
                          ? 'border-cyan-500 bg-cyan-900/10' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                      onClick={() => setSelectedSku(sku)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{sku.code}</h3>
                              {isSelected && hasUnavailable && (
                                <AlertTriangle className="h-4 w-4 text-orange-400" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{sku.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Custo</p>
                            <p className="font-semibold text-green-400">
                              R$ {isSelected ? totalCost.toFixed(2) : "0.00"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Layers className="h-4 w-4" />
                            {isSelected ? (skuBomItems?.length || 0) : "?"} ingredientes
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Package className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum produto encontrado</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* BOM Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              Receita / BOM
            </h2>
            
            {selectedSku ? (
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedSku.code}</CardTitle>
                      <CardDescription>{selectedSku.description}</CardDescription>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        {bomItems && bomItems.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setIsCopyModalOpen(true)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar BOM
                          </Button>
                        )}
                        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500">
                              <Plus className="mr-2 h-4 w-4" />
                              Adicionar Item
                            </Button>
                          </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Ingrediente</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Item do Almoxarifado *</Label>
                              <Select 
                                value={formData.itemId} 
                                onValueChange={(value) => setFormData({ ...formData, itemId: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {warehouseItems?.map((item: any) => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                      {item.name} ({item.currentStock} {item.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo de Item *</Label>
                              <Select 
                                value={formData.itemType} 
                                onValueChange={(value: "materia_prima" | "embalagem" | "insumo") => setFormData({ ...formData, itemType: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="materia_prima">Matéria-prima</SelectItem>
                                  <SelectItem value="embalagem">Embalagem</SelectItem>
                                  <SelectItem value="insumo">Insumo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Quantidade por Unidade *</Label>
                                <Input 
                                  type="number" 
                                  step="0.0001" 
                                  value={formData.quantityPerUnit}
                                  onChange={(e) => setFormData({ ...formData, quantityPerUnit: e.target.value })}
                                  placeholder="Ex: 0.5"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Unidade *</Label>
                                <Select 
                                  value={formData.unit} 
                                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="g">g</SelectItem>
                                    <SelectItem value="L">L</SelectItem>
                                    <SelectItem value="mL">mL</SelectItem>
                                    <SelectItem value="un">un</SelectItem>
                                    <SelectItem value="m">m</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Perda/Desperdício (%)</Label>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  value={formData.wastagePercent}
                                  onChange={(e) => setFormData({ ...formData, wastagePercent: e.target.value })}
                                  placeholder="Ex: 5"
                                />
                              </div>
                              <div className="space-y-2 flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={formData.isOptional}
                                    onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                                    className="rounded"
                                  />
                                  <span className="text-sm">Item opcional</span>
                                </label>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Observações</Label>
                              <Input 
                                value={formData.observations}
                                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                                placeholder="Observações sobre o ingrediente..."
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsAddItemOpen(false); resetForm(); }}>
                              Cancelar
                            </Button>
                            <Button onClick={handleAddItem} disabled={createMutation.isPending}>
                              {createMutation.isPending ? "Adicionando..." : "Adicionar"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* BOM Items */}
                  {bomItems && bomItems.length > 0 ? (
                    <div className="space-y-3">
                      {bomItems.map((item: any) => {
                        const availability = getItemAvailability(item.itemId);
                        // Custo unitário padrão (pode ser configurado por item no futuro)
                        const unitCost = 1.00; // R$ 1,00 por unidade como placeholder
                        const quantity = parseFloat(item.quantityPerUnit) || 0;
                        const itemCost = quantity * unitCost;
                        
                        return (
                          <div 
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              availability.available 
                                ? 'bg-slate-800/50' 
                                : 'bg-red-900/20 border border-red-500/30'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${
                                availability.available ? 'bg-green-500/20' : 'bg-red-500/20'
                              }`}>
                                <Package className={`h-4 w-4 ${
                                  availability.available ? 'text-green-400' : 'text-red-400'
                                }`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{item.itemName}</p>
                                  {item.isOptional && (
                                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantityPerUnit} {item.unit} × R$ {unitCost.toFixed(2)}
                                </p>
                                {!availability.available && (
                                  <p className="text-xs text-red-400">Estoque: {availability.stock} {item.unit}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">
                                R$ {itemCost.toFixed(2)}
                              </p>
                              {canEdit && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => openEditModal(item)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-red-400"
                                    onClick={() => handleDeleteItem(item.id)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhum ingrediente cadastrado</p>
                      <p className="text-sm text-muted-foreground">
                        {canEdit ? 'Clique em "Adicionar Item" para começar' : 'Sem ingredientes cadastrados para este produto'}
                      </p>
                    </div>
                  )}

                  {/* Summary */}
                  {bomItems && bomItems.length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-slate-800/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <Calculator className="h-4 w-4" />
                              <span className="text-sm">Custo Total</span>
                            </div>
                            <p className="text-2xl font-bold text-green-400">
                              R$ {calculateTotalCost(bomItems).toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-slate-800/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <Scale className="h-4 w-4" />
                              <span className="text-sm">Rendimento</span>
                            </div>
                            <p className="text-2xl font-bold">
                              1 {selectedSku.unit || 'un'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {bomItems.some((item: any) => !getItemAvailability(item.itemId).available) && (
                        <div className="mt-4 p-3 rounded-lg bg-orange-900/20 border border-orange-500/30 flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-orange-400">Atenção: Itens Indisponíveis</p>
                            <p className="text-sm text-muted-foreground">
                              Alguns ingredientes estão com estoque zerado ou abaixo do necessário.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed h-[400px]">
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione um produto</h3>
                  <p className="text-muted-foreground text-center">
                    Clique em um produto na lista ao lado para visualizar
                    <br />
                    ou editar sua receita/BOM.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Item Dialog */}
      <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Ingrediente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="font-medium">{editingItem?.itemName}</p>
              <p className="text-sm text-muted-foreground">
                {editingItem?.itemType === "materia_prima" ? "Matéria-prima" : 
                 editingItem?.itemType === "embalagem" ? "Embalagem" : "Insumo"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade por Unidade *</Label>
                <Input 
                  type="number" 
                  step="0.0001" 
                  value={formData.quantityPerUnit}
                  onChange={(e) => setFormData({ ...formData, quantityPerUnit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="mL">mL</SelectItem>
                    <SelectItem value="un">un</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Perda/Desperdício (%)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.wastagePercent}
                  onChange={(e) => setFormData({ ...formData, wastagePercent: e.target.value })}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isOptional}
                    onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Item opcional</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input 
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsEditItemOpen(false); setEditingItem(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateItem} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Copiar BOM */}
      <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Copiar BOM para outro SKU</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground">SKU de Origem</Label>
              <p className="font-mono font-medium">{selectedSku?.code} - {selectedSku?.description}</p>
              <p className="text-sm text-muted-foreground mt-1">{bomItems?.length || 0} ingredientes</p>
            </div>
            <div className="space-y-2">
              <Label>SKU de Destino *</Label>
              <Select value={targetSkuId} onValueChange={setTargetSkuId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o SKU de destino" />
                </SelectTrigger>
                <SelectContent>
                  {skus?.filter((s: any) => s.id !== selectedSku?.id).map((sku: any) => (
                    <SelectItem key={sku.id} value={String(sku.id)}>
                      {sku.code} - {sku.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Atenção: Esta ação irá substituir todos os ingredientes existentes no SKU de destino.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCopyModalOpen(false); setTargetSkuId(""); }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (!selectedSku || !targetSkuId) {
                  toast.error("Selecione um SKU de destino");
                  return;
                }
                copyMutation.mutate({
                  sourceSkuId: selectedSku.id,
                  targetSkuId: parseInt(targetSkuId),
                });
              }}
              disabled={copyMutation.isPending || !targetSkuId}
            >
              {copyMutation.isPending ? "Copiando..." : "Copiar BOM"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
