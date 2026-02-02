import { useState } from "react";
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
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Factory, 
  Wrench, 
  Briefcase, 
  ShieldCheck, 
  Truck,
  Search,
  Filter,
  MoreHorizontal,
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

const costCenterTypes = [
  { value: "producao", label: "Produção", icon: Factory, color: "bg-blue-500" },
  { value: "manutencao", label: "Manutenção", icon: Wrench, color: "bg-orange-500" },
  { value: "administrativo", label: "Administrativo", icon: Briefcase, color: "bg-purple-500" },
  { value: "qualidade", label: "Qualidade", icon: ShieldCheck, color: "bg-green-500" },
  { value: "logistica", label: "Logística", icon: Truck, color: "bg-cyan-500" },
] as const;

type CostCenterType = typeof costCenterTypes[number]["value"];

export default function CustoCentros() {
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    type: "producao" as CostCenterType,
  });

  // Queries
  const { data: costCenters, isLoading, refetch } = trpc.costs.costCenters.list.useQuery({
    status: filterStatus === "all" ? undefined : filterStatus as "ativo" | "inativo",
    type: filterType === "all" ? undefined : filterType as CostCenterType,
  });

  // Mutations
  const utils = trpc.useUtils();

  const createMutation = trpc.costs.costCenters.create.useMutation({
    onSuccess: () => {
      toast.success("Centro de custo criado com sucesso!");
      setShowModal(false);
      resetForm();
      utils.costs.costCenters.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar centro de custo: ${error.message}`);
    },
  });

  const updateMutation = trpc.costs.costCenters.update.useMutation({
    onSuccess: () => {
      toast.success("Centro de custo atualizado com sucesso!");
      setShowModal(false);
      setEditingCenter(null);
      resetForm();
      utils.costs.costCenters.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar centro de custo: ${error.message}`);
    },
  });

  const deleteMutation = trpc.costs.costCenters.delete.useMutation({
    onSuccess: () => {
      toast.success("Centro de custo excluído com sucesso!");
      setDeleteConfirm(null);
      utils.costs.costCenters.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir centro de custo: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      type: "producao",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingCenter(null);
    setShowModal(true);
  };

  const handleOpenEdit = (center: any) => {
    setEditingCenter(center);
    setFormData({
      code: center.code,
      name: center.name,
      description: center.description || "",
      type: center.type,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast.error("Preencha os campos obrigatórios (código e nome)");
      return;
    }

    if (editingCenter) {
      updateMutation.mutate({
        id: editingCenter.id,
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
      });
    } else {
      createMutation.mutate({
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
      });
    }
  };

  const handleToggleStatus = (center: any) => {
    updateMutation.mutate({
      id: center.id,
      status: center.status === "ativo" ? "inativo" : "ativo",
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const getTypeInfo = (type: string) => {
    return costCenterTypes.find(t => t.value === type) || costCenterTypes[0];
  };

  // Filter centers by search term
  const filteredCenters = costCenters?.filter(center => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      center.code.toLowerCase().includes(search) ||
      center.name.toLowerCase().includes(search) ||
      (center.description && center.description.toLowerCase().includes(search))
    );
  });

  // Stats
  const totalCenters = costCenters?.length || 0;
  const activeCenters = costCenters?.filter(c => c.status === "ativo").length || 0;
  const centersByType = costCenterTypes.map(type => ({
    ...type,
    count: costCenters?.filter(c => c.type === type.value).length || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Centros de Custo
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os centros de custo para alocação de custos indiretos
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Centro de Custo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalCenters}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{activeCenters}</div>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        {centersByType.slice(0, 4).map(type => {
          const Icon = type.icon;
          return (
            <Card key={type.value}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{type.count}</span>
                </div>
                <p className="text-xs text-muted-foreground">{type.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  {costCenterTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Centros de Custo</CardTitle>
          <CardDescription>
            {filteredCenters?.length || 0} centro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredCenters && filteredCenters.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCenters.map((center) => {
                  const typeInfo = getTypeInfo(center.type);
                  const Icon = typeInfo.icon;
                  return (
                    <TableRow key={center.id}>
                      <TableCell className="font-mono font-medium">
                        {center.code}
                      </TableCell>
                      <TableCell className="font-medium">{center.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Icon className="h-3 w-3" />
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {center.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={center.status === "ativo" ? "default" : "secondary"}>
                          {center.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(center)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(center)}>
                              {center.status === "ativo" ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteConfirm(center.id)}
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
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum centro de custo encontrado</p>
              <Button variant="link" onClick={handleOpenCreate}>
                Criar primeiro centro de custo
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
              {editingCenter ? "Editar Centro de Custo" : "Novo Centro de Custo"}
            </DialogTitle>
            <DialogDescription>
              {editingCenter 
                ? "Atualize as informações do centro de custo" 
                : "Preencha os dados para criar um novo centro de custo"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  placeholder="Ex: CC001"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: CostCenterType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {costCenterTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Linha de Produção Principal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição detalhada do centro de custo..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este centro de custo? Esta ação não pode ser desfeita.
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
