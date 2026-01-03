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
import { Plus, Search, Download, Boxes, Eye, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES_GERAL = [
  "Material de Limpeza",
  "Material de CIP",
  "EPI",
  "Uniformes",
  "Peças de Manutenção",
  "Ferramentas",
  "Material de Escritório",
  "Outros",
];

export default function AlmoxarifadoGeral() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showBelowMinimum, setShowBelowMinimum] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    internalCode: "",
    name: "",
    description: "",
    unit: "unidade" as "kg" | "litro" | "unidade" | "metro" | "rolo",
    category: "",
    minimumStock: "",
    defaultSupplier: "",
    location: "",
    externalCode: "",
  });

  // Movement form state
  const [movementData, setMovementData] = useState({
    movementType: "entrada" as "entrada" | "saida" | "ajuste",
    quantity: "",
    reason: "",
    observations: "",
  });

  // Queries
  const { data: items, refetch } = trpc.warehouseItems.list.useQuery({
    warehouseType: "geral",
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: searchTerm || undefined,
    belowMinimum: showBelowMinimum || undefined,
  });

  // Mutations
  const createMutation = trpc.warehouseItems.create.useMutation({
    onSuccess: () => {
      toast.success("Item cadastrado com sucesso!");
      setIsModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar item: " + error.message);
    },
  });

  const movementMutation = trpc.warehouseItems.createMovement.useMutation({
    onSuccess: () => {
      toast.success("Movimentação registrada com sucesso!");
      setIsMovementModalOpen(false);
      resetMovementForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar movimentação: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      internalCode: "",
      name: "",
      description: "",
      unit: "unidade",
      category: "",
      minimumStock: "",
      defaultSupplier: "",
      location: "",
      externalCode: "",
    });
  };

  const resetMovementForm = () => {
    setMovementData({
      movementType: "entrada",
      quantity: "",
      reason: "",
      observations: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.internalCode || !formData.name || !formData.category || !formData.minimumStock) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      internalCode: formData.internalCode,
      name: formData.name,
      description: formData.description || undefined,
      unit: formData.unit,
      warehouseType: "geral",
      category: formData.category,
      minimumStock: formData.minimumStock,
      defaultSupplier: formData.defaultSupplier || undefined,
      location: formData.location || undefined,
      externalCode: formData.externalCode || undefined,
    });
  };

  const handleMovement = () => {
    if (!selectedItem || !movementData.quantity || !movementData.reason) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    movementMutation.mutate({
      warehouseItemId: selectedItem.id,
      movementType: movementData.movementType,
      quantity: movementData.quantity,
      reason: movementData.reason,
      observations: movementData.observations || undefined,
    });
  };

  const openViewModal = (item: any) => {
    setSelectedItem(item);
    setFormData({
      internalCode: item.internalCode,
      name: item.name,
      description: item.description || "",
      unit: item.unit,
      category: item.category,
      minimumStock: item.minimumStock,
      defaultSupplier: item.defaultSupplier || "",
      location: item.location || "",
      externalCode: item.externalCode || "",
    });
    setIsViewModalOpen(true);
  };

  const openMovementModal = (item: any, type: "entrada" | "saida") => {
    setSelectedItem(item);
    setMovementData({
      movementType: type,
      quantity: "",
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

  const exportCSV = () => {
    if (!items || items.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = ["company_code", "entity_id", "external_code", "codigo_interno", "nome", "unidade", "categoria", "estoque_atual", "estoque_minimo", "fornecedor", "localizacao", "status"];
    const rows = items.map(item => [
      "COCO_LITORANEO",
      item.id,
      item.externalCode || "",
      item.internalCode,
      item.name,
      item.unit,
      item.category,
      item.currentStock,
      item.minimumStock,
      item.defaultSupplier || "",
      item.location || "",
      item.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `almoxarifado_geral_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Arquivo exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Almoxarifado - Itens Gerais</h1>
          <p className="text-muted-foreground">Gerencie materiais de limpeza, EPIs, manutenção e outros</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Item
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
                  placeholder="Buscar por nome ou código..."
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
                {CATEGORIES_GERAL.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showBelowMinimum ? "default" : "outline"}
              onClick={() => setShowBelowMinimum(!showBelowMinimum)}
            >
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
            <Boxes className="h-5 w-5" />
            Itens Gerais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items && items.length > 0 ? (
                  items.map((item) => {
                    const stockStatus = getStockStatus(item.currentStock, item.minimumStock);
                    return (
                      <TableRow key={item.id} className={stockStatus === "critical" || stockStatus === "low" ? "bg-destructive/5" : ""}>
                        <TableCell className="font-mono">{item.internalCode}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(item.currentStock).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {Number(item.minimumStock).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} {item.unit}
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum item cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Novo Item */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Item Geral</DialogTitle>
            <DialogDescription>
              Cadastre um novo item de uso geral
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="internalCode">Código Interno *</Label>
                <Input
                  id="internalCode"
                  placeholder="GER-001"
                  value={formData.internalCode}
                  onChange={(e) => setFormData({ ...formData, internalCode: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value: "kg" | "litro" | "unidade" | "metro" | "rolo") => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unidade">Unidade (un)</SelectItem>
                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                    <SelectItem value="litro">Litro (L)</SelectItem>
                    <SelectItem value="metro">Metro (m)</SelectItem>
                    <SelectItem value="rolo">Rolo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Item *</Label>
              <Input
                id="name"
                placeholder="Nome do item"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES_GERAL.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição detalhada do item"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimumStock">Estoque Mínimo *</Label>
                <Input
                  id="minimumStock"
                  type="number"
                  step="1"
                  placeholder="0"
                  value={formData.minimumStock}
                  onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  placeholder="Ex: Armário B2"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultSupplier">Fornecedor Padrão</Label>
              <Input
                id="defaultSupplier"
                placeholder="Nome do fornecedor"
                value={formData.defaultSupplier}
                onChange={(e) => setFormData({ ...formData, defaultSupplier: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Cadastrar Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar Item */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Código</Label>
                  <p className="font-mono font-medium">{selectedItem.internalCode}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Unidade</Label>
                  <p className="font-medium">{selectedItem.unit}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{selectedItem.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Categoria</Label>
                <p className="font-medium">{selectedItem.category}</p>
              </div>
              {selectedItem.description && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="font-medium">{selectedItem.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground">Estoque Atual</Label>
                  <p className="font-mono text-lg font-bold">
                    {Number(selectedItem.currentStock).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} {selectedItem.unit}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estoque Mínimo</Label>
                  <p className="font-mono text-lg">
                    {Number(selectedItem.minimumStock).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} {selectedItem.unit}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Localização</Label>
                  <p className="font-medium">{selectedItem.location || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fornecedor</Label>
                  <p className="font-medium">{selectedItem.defaultSupplier || "-"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Movimentação */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {movementData.movementType === "entrada" ? "Entrada de Estoque" : "Saída de Estoque"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="text-muted-foreground">Estoque Atual</Label>
              <p className="font-mono text-lg font-bold">
                {selectedItem && Number(selectedItem.currentStock).toLocaleString("pt-BR", { minimumFractionDigits: 0 })} {selectedItem?.unit}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                placeholder="0"
                value={movementData.quantity}
                onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
              />
            </div>

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
                      <SelectItem value="Compra">Compra</SelectItem>
                      <SelectItem value="Devolução">Devolução</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Ajuste de Inventário">Ajuste de Inventário</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Uso/Consumo">Uso/Consumo</SelectItem>
                      <SelectItem value="Perda/Avaria">Perda/Avaria</SelectItem>
                      <SelectItem value="Entrega Colaborador">Entrega Colaborador</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
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
                      ? (Number(selectedItem.currentStock) + Number(movementData.quantity)).toLocaleString("pt-BR", { minimumFractionDigits: 0 })
                      : (Number(selectedItem.currentStock) - Number(movementData.quantity)).toLocaleString("pt-BR", { minimumFractionDigits: 0 })
                  )} {selectedItem?.unit}
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
