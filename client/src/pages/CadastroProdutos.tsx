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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Pencil, Trash2, Package, PackageCheck, AlertTriangle, Filter } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

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

const PACKAGE_WEIGHTS = [
  { value: "1", label: "1 kg" },
  { value: "5", label: "5 kg" },
  { value: "10", label: "10 kg" },
  { value: "25", label: "25 kg" },
];

export default function CadastroProdutos() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Auth para verificar permissões
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'gerente' || user?.role === 'ceo';

  // Form state para criação
  const [createFormData, setCreateFormData] = useState({
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

  // Form state para edição
  const [editFormData, setEditFormData] = useState({
    code: "",
    description: "",
    category: "" as "" | "seco" | "umido" | "adocado",
    variation: "" as "" | "flocos" | "medio" | "fino",
    packageWeight: "",
    packageType: "",
    minimumStock: "",
    shelfLifeDays: "",
    suggestedPrice: "",
    externalCode: "",
    status: "ativo" as "ativo" | "inativo",
  });

  // Queries
  const { data: items, refetch } = trpc.skus.list.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchTerm || undefined,
  });

  // Mutations
  const createMutation = trpc.skus.create.useMutation({
    onSuccess: () => {
      toast.success("Produto cadastrado com sucesso!");
      setIsCreateModalOpen(false);
      resetCreateForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar produto: " + error.message);
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

  const deleteMutation = trpc.skus.update.useMutation({
    onSuccess: () => {
      toast.success("Produto inativado com sucesso!");
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao inativar produto: " + error.message);
    },
  });

  const resetCreateForm = () => {
    setCreateFormData({
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

  const generateCode = (category: string, variation: string, weight: string) => {
    const catPrefix = category === "seco" ? "CRS" : category === "umido" ? "CRU" : "CRA";
    const varSuffix = variation === "flocos" ? "FL" : variation === "medio" ? "MD" : "FN";
    return `${catPrefix}-${varSuffix}-${weight}KG`;
  };

  const generateDescription = (category: string, variation: string, weight: string) => {
    const catLabel = CATEGORIES.find(c => c.value === category)?.label || "";
    const varLabel = VARIATIONS.find(v => v.value === variation)?.label || "";
    return `${catLabel} - ${varLabel} ${weight}kg`;
  };

  const handleCategoryChange = (value: string) => {
    const category = value as "seco" | "umido" | "adocado";
    setCreateFormData(prev => {
      const newData = { ...prev, category };
      if (prev.variation && prev.packageWeight) {
        newData.code = generateCode(category, prev.variation, prev.packageWeight);
        newData.description = generateDescription(category, prev.variation, prev.packageWeight);
      }
      return newData;
    });
  };

  const handleVariationChange = (value: string) => {
    const variation = value as "flocos" | "medio" | "fino";
    setCreateFormData(prev => {
      const newData = { ...prev, variation };
      if (prev.category && prev.packageWeight) {
        newData.code = generateCode(prev.category, variation, prev.packageWeight);
        newData.description = generateDescription(prev.category, variation, prev.packageWeight);
      }
      return newData;
    });
  };

  const handleWeightChange = (value: string) => {
    setCreateFormData(prev => {
      const newData = { ...prev, packageWeight: value };
      if (prev.category && prev.variation) {
        newData.code = generateCode(prev.category, prev.variation, value);
        newData.description = generateDescription(prev.category, prev.variation, value);
      }
      return newData;
    });
  };

  const handleCreateSubmit = () => {
    if (!createFormData.code || !createFormData.description || !createFormData.category || 
        !createFormData.variation || !createFormData.packageWeight || !createFormData.minimumStock) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      code: createFormData.code,
      description: createFormData.description,
      category: createFormData.category as "seco" | "umido" | "adocado",
      variation: createFormData.variation as "flocos" | "medio" | "fino",
      packageWeight: createFormData.packageWeight,
      packageType: createFormData.packageType || undefined,
      minimumStock: createFormData.minimumStock,
      shelfLifeDays: parseInt(createFormData.shelfLifeDays),
      suggestedPrice: createFormData.suggestedPrice || undefined,
      externalCode: createFormData.externalCode || undefined,
    });
  };

  const openEditModal = (item: any) => {
    setSelectedItem(item);
    setEditFormData({
      code: item.code || "",
      description: item.description || "",
      category: item.category || "",
      variation: item.variation || "",
      packageWeight: item.packageWeight || "",
      packageType: item.packageType || "",
      minimumStock: item.minimumStock || "",
      shelfLifeDays: item.shelfLifeDays?.toString() || "180",
      suggestedPrice: item.suggestedPrice || "",
      externalCode: item.externalCode || "",
      status: item.status || "ativo",
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
      category: editFormData.category as "seco" | "umido" | "adocado" | undefined,
      variation: editFormData.variation as "flocos" | "medio" | "fino" | undefined,
      packageWeight: editFormData.packageWeight || undefined,
      packageType: editFormData.packageType || undefined,
      minimumStock: editFormData.minimumStock || undefined,
      shelfLifeDays: editFormData.shelfLifeDays ? parseInt(editFormData.shelfLifeDays) : undefined,
      suggestedPrice: editFormData.suggestedPrice || undefined,
      externalCode: editFormData.externalCode || undefined,
      status: editFormData.status,
    });
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    deleteMutation.mutate({
      id: selectedItem.id,
      status: "inativo",
    });
  };

  const getCategoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label || value;
  const getVariationLabel = (value: string) => VARIATIONS.find(v => v.value === value)?.label || value;

  const activeItems = items?.filter(i => i.status === "ativo") || [];
  const inactiveItems = items?.filter(i => i.status === "inativo") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cadastro de Produtos</h1>
          <p className="text-muted-foreground">Gerencie os produtos acabados (SKUs) do sistema</p>
        </div>
        {canManage && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produtos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produtos Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{inactiveItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{CATEGORIES.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista de Produtos
          </CardTitle>
          <CardDescription>
            {items?.length || 0} produto(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Variação</TableHead>
                  <TableHead className="text-right">Embalagem</TableHead>
                  <TableHead className="text-right">Est. Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items && items.length > 0 ? (
                  items.map((item) => (
                    <TableRow key={item.id} className={item.status === "inativo" ? "opacity-50" : ""}>
                      <TableCell className="font-mono font-medium">{item.code}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{getCategoryLabel(item.category)}</TableCell>
                      <TableCell>{getVariationLabel(item.variation)}</TableCell>
                      <TableCell className="text-right">{item.packageWeight} kg</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(item.minimumStock).toLocaleString("pt-BR")} kg
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "ativo" ? "default" : "secondary"}>
                          {item.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(item)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {item.status === "ativo" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsDeleteDialogOpen(true);
                                }}
                                title="Inativar"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Criar Produto */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
            <DialogDescription>
              Cadastre um novo produto acabado (SKU)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={createFormData.category} onValueChange={handleCategoryChange}>
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
                <Label>Variação *</Label>
                <Select value={createFormData.variation} onValueChange={handleVariationChange}>
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
                <Label>Peso Embalagem *</Label>
                <Select value={createFormData.packageWeight} onValueChange={handleWeightChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_WEIGHTS.map((w) => (
                      <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Código (gerado)</Label>
                <Input
                  value={createFormData.code}
                  onChange={(e) => setCreateFormData({ ...createFormData, code: e.target.value.toUpperCase() })}
                  placeholder="CRS-FL-5KG"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição (gerada)</Label>
              <Input
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                placeholder="Coco Ralado Seco - Flocos 5kg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Mínimo (kg) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="100"
                  value={createFormData.minimumStock}
                  onChange={(e) => setCreateFormData({ ...createFormData, minimumStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  placeholder="180"
                  value={createFormData.shelfLifeDays}
                  onChange={(e) => setCreateFormData({ ...createFormData, shelfLifeDays: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Embalagem</Label>
                <Input
                  placeholder="Saco, Caixa..."
                  value={createFormData.packageType}
                  onChange={(e) => setCreateFormData({ ...createFormData, packageType: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Sugerido (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={createFormData.suggestedPrice}
                  onChange={(e) => setCreateFormData({ ...createFormData, suggestedPrice: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Código Externo (ERP)</Label>
              <Input
                placeholder="Código para integração"
                value={createFormData.externalCode}
                onChange={(e) => setCreateFormData({ ...createFormData, externalCode: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Produto */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Altere as informações do produto
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={editFormData.code}
                  onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={editFormData.status} 
                  onValueChange={(value: "ativo" | "inativo") => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={editFormData.category} 
                  onValueChange={(value: "seco" | "umido" | "adocado") => setEditFormData({ ...editFormData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Variação</Label>
                <Select 
                  value={editFormData.variation} 
                  onValueChange={(value: "flocos" | "medio" | "fino") => setEditFormData({ ...editFormData, variation: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Peso Embalagem</Label>
                <Select 
                  value={editFormData.packageWeight} 
                  onValueChange={(value) => setEditFormData({ ...editFormData, packageWeight: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_WEIGHTS.map((w) => (
                      <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo Embalagem</Label>
                <Input
                  value={editFormData.packageType}
                  onChange={(e) => setEditFormData({ ...editFormData, packageType: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Mínimo (kg)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.minimumStock}
                  onChange={(e) => setEditFormData({ ...editFormData, minimumStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  value={editFormData.shelfLifeDays}
                  onChange={(e) => setEditFormData({ ...editFormData, shelfLifeDays: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Sugerido (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.suggestedPrice}
                  onChange={(e) => setEditFormData({ ...editFormData, suggestedPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Código Externo (ERP)</Label>
                <Input
                  value={editFormData.externalCode}
                  onChange={(e) => setEditFormData({ ...editFormData, externalCode: e.target.value })}
                />
              </div>
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

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Inativar Produto
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar o produto <strong>{selectedItem?.code}</strong>?
              <br /><br />
              O produto não será excluído permanentemente e poderá ser reativado posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Inativando..." : "Inativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aviso de Permissão */}
      {!canManage && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-700">
              Você não tem permissão para criar, editar ou excluir produtos. 
              Entre em contato com um administrador ou gerente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
