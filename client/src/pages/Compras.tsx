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
import { Plus, Download, ShoppingCart, Eye, Check, X, AlertCircle, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function Compras() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    sector: "",
    urgency: "",
    search: "",
  });

  const utils = trpc.useUtils();
  const { data: requests = [], isLoading } = trpc.purchases.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );
  const { data: suggestions = [] } = trpc.purchases.getSuggestions.useQuery();
  const { data: requestDetails } = trpc.purchases.getById.useQuery(
    { id: selectedRequest! },
    { enabled: !!selectedRequest }
  );

  const createMutation = trpc.purchases.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Solicitação ${data.requestNumber} criada com sucesso!`);
      setIsModalOpen(false);
      utils.purchases.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao criar solicitação: " + error.message);
    },
  });

  const updateStatusMutation = trpc.purchases.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.purchases.list.invalidate();
      utils.purchases.getById.invalidate();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const addQuotationMutation = trpc.purchases.addQuotation.useMutation({
    onSuccess: () => {
      toast.success("Cotação adicionada!");
      setIsQuotationModalOpen(false);
      utils.purchases.getById.invalidate();
      utils.purchases.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    sector: "producao" as "producao" | "qualidade" | "manutencao" | "administrativo" | "almoxarifado",
    urgency: "media" as "baixa" | "media" | "alta" | "critica",
    deadlineDate: "",
    items: [{ itemName: "", specification: "", quantity: "", unit: "un", estimatedValue: "" }],
  });

  const [quotationForm, setQuotationForm] = useState({
    supplierName: "",
    supplierCnpj: "",
    supplierContact: "",
    supplierPhone: "",
    supplierEmail: "",
    deliveryDays: "",
    paymentCondition: "",
    observations: "",
    items: [] as { requestItemId: number; unitValue: string; totalValue: string }[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = formData.items.filter((i) => i.itemName && i.quantity);
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    createMutation.mutate({
      sector: formData.sector,
      urgency: formData.urgency,
      deadlineDate: formData.deadlineDate || undefined,
      items: validItems,
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemName: "", specification: "", quantity: "", unit: "un", estimatedValue: "" }],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleApprove = (requestId: number, quotationId: number) => {
    updateStatusMutation.mutate({
      id: requestId,
      status: "aprovado",
      chosenQuotationId: quotationId,
    });
  };

  const handleReject = (requestId: number) => {
    const reason = prompt("Motivo da reprovação:");
    if (reason) {
      updateStatusMutation.mutate({
        id: requestId,
        status: "reprovado",
        rejectionReason: reason,
      });
    }
  };

  const exportCSV = () => {
    const headers = ["Número", "Data", "Setor", "Urgência", "Status", "Valor Estimado", "Valor Aprovado"];
    const rows = requests.map((r) => [
      r.requestNumber,
      format(new Date(r.createdAt), "dd/MM/yyyy"),
      sectorLabels[r.sector],
      urgencyLabels[r.urgency],
      statusLabels[r.status],
      r.totalEstimated || "0",
      r.totalApproved || "-",
    ]);

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `solicitacoes_compra_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const sectorLabels: Record<string, string> = {
    producao: "Produção",
    qualidade: "Qualidade",
    manutencao: "Manutenção",
    administrativo: "Administrativo",
    almoxarifado: "Almoxarifado",
  };

  const urgencyLabels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica",
  };

  const statusLabels: Record<string, string> = {
    solicitado: "Solicitado",
    em_cotacao: "Em Cotação",
    aguardando_aprovacao: "Aguardando Aprovação",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    comprado: "Comprado",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };

  const urgencyColors: Record<string, string> = {
    baixa: "bg-gray-100 text-gray-800",
    media: "bg-blue-100 text-blue-800",
    alta: "bg-orange-100 text-orange-800",
    critica: "bg-red-100 text-red-800",
  };

  const statusColors: Record<string, string> = {
    solicitado: "bg-gray-100 text-gray-800",
    em_cotacao: "bg-blue-100 text-blue-800",
    aguardando_aprovacao: "bg-yellow-100 text-yellow-800",
    aprovado: "bg-green-100 text-green-800",
    reprovado: "bg-red-100 text-red-800",
    comprado: "bg-purple-100 text-purple-800",
    entregue: "bg-green-200 text-green-900",
    cancelado: "bg-gray-200 text-gray-600",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Compras</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie solicitações de compra e cotações
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
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Solicitação de Compra</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Setor *</Label>
                    <Select
                      value={formData.sector}
                      onValueChange={(v) => setFormData({ ...formData, sector: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="qualidade">Qualidade</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Urgência *</Label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(v) => setFormData({ ...formData, urgency: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo Desejado</Label>
                    <Input
                      type="date"
                      value={formData.deadlineDate}
                      onChange={(e) => setFormData({ ...formData, deadlineDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Itens</Label>
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Input
                          placeholder="Nome do item *"
                          value={item.itemName}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].itemName = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="Especificação"
                          value={item.specification}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].specification = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qtd *"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].quantity = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Valor est."
                          value={item.estimatedValue}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].estimatedValue = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          disabled={formData.items.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Solicitação"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Solicitações</TabsTrigger>
          <TabsTrigger value="suggestions">
            Sugestões de Compra
            {suggestions.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {suggestions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <Input
                    placeholder="Número ou item..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-48"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="solicitado">Solicitado</SelectItem>
                      <SelectItem value="em_cotacao">Em Cotação</SelectItem>
                      <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select
                    value={filters.sector}
                    onValueChange={(v) => setFilters({ ...filters, sector: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Urgência</Label>
                  <Select
                    value={filters.urgency}
                    onValueChange={(v) => setFilters({ ...filters, urgency: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setFilters({ status: "", sector: "", urgency: "", search: "" })}
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
                    <TableHead>Setor</TableHead>
                    <TableHead>Urgência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Est.</TableHead>
                    <TableHead>Solicitante</TableHead>
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
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhuma solicitação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono font-medium">
                          {request.requestNumber}
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.createdAt), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{sectorLabels[request.sector]}</TableCell>
                        <TableCell>
                          <Badge className={urgencyColors[request.urgency]}>
                            {urgencyLabels[request.urgency]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[request.status]}>
                            {statusLabels[request.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.totalEstimated
                            ? `R$ ${Number(request.totalEstimated).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                        <TableCell>{request.requesterName || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedRequest(request.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === "aguardando_aprovacao" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600"
                                  onClick={() => {
                                    // Simplified: approve with first quotation
                                    toast.info("Selecione uma cotação na visualização detalhada");
                                    setSelectedRequest(request.id);
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => handleReject(request.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Itens Abaixo do Estoque Mínimo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Todos os itens estão com estoque adequado!
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Almoxarifado</TableHead>
                      <TableHead className="text-right">Estoque Atual</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Sugestão de Compra</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.warehouseType === "producao" ? "Produção" : "Geral"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {Number(item.currentStock).toLocaleString("pt-BR")} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(item.minimumStock).toLocaleString("pt-BR")} {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.suggestedQuantity.toLocaleString("pt-BR")} {item.unit}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFormData({
                                sector: "almoxarifado",
                                urgency: "media",
                                deadlineDate: "",
                                items: [{
                                  itemName: item.name,
                                  specification: "",
                                  quantity: item.suggestedQuantity.toString(),
                                  unit: item.unit,
                                  estimatedValue: "",
                                }],
                              });
                              setIsModalOpen(true);
                            }}
                          >
                            Criar Solicitação
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Solicitação {requestDetails?.requestNumber}
            </DialogTitle>
          </DialogHeader>
          {requestDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground">Setor</Label>
                  <p className="font-medium">{sectorLabels[requestDetails.sector]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Urgência</Label>
                  <Badge className={urgencyColors[requestDetails.urgency]}>
                    {urgencyLabels[requestDetails.urgency]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusColors[requestDetails.status]}>
                    {statusLabels[requestDetails.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Solicitante</Label>
                  <p className="font-medium">{requestDetails.requesterName || "-"}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Itens Solicitados</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Especificação</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Estimado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestDetails.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.specification || "-"}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.estimatedValue
                            ? `R$ ${Number(item.estimatedValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-muted-foreground">Cotações</Label>
                  {["solicitado", "em_cotacao"].includes(requestDetails.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setQuotationForm({
                          supplierName: "",
                          supplierCnpj: "",
                          supplierContact: "",
                          supplierPhone: "",
                          supplierEmail: "",
                          deliveryDays: "",
                          paymentCondition: "",
                          observations: "",
                          items: requestDetails.items?.map((i: any) => ({
                            requestItemId: i.id,
                            unitValue: "",
                            totalValue: "",
                          })) || [],
                        });
                        setIsQuotationModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Cotação
                    </Button>
                  )}
                </div>
                {requestDetails.quotations?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma cotação registrada
                  </p>
                ) : (
                  <div className="space-y-4">
                    {requestDetails.quotations?.map((quotation: any) => (
                      <Card key={quotation.id} className={quotation.isChosen ? "border-green-500" : ""}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{quotation.supplierName}</p>
                              <p className="text-sm text-muted-foreground">
                                {quotation.paymentCondition || "Condição não informada"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                R$ {Number(quotation.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                              {quotation.deliveryDays && (
                                <p className="text-sm text-muted-foreground">
                                  Entrega: {quotation.deliveryDays} dias
                                </p>
                              )}
                            </div>
                          </div>
                          {quotation.isChosen && (
                            <Badge className="bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Cotação Escolhida
                            </Badge>
                          )}
                          {requestDetails.status === "aguardando_aprovacao" && !quotation.isChosen && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => handleApprove(requestDetails.id, quotation.id)}
                            >
                              Aprovar esta Cotação
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {requestDetails.quotations?.length > 0 && requestDetails.status === "em_cotacao" && (
                <Button
                  onClick={() => {
                    updateStatusMutation.mutate({
                      id: requestDetails.id,
                      status: "aguardando_aprovacao",
                    });
                  }}
                >
                  Enviar para Aprovação
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Cotação */}
      <Dialog open={isQuotationModalOpen} onOpenChange={setIsQuotationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Cotação</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!quotationForm.supplierName) {
                toast.error("Informe o nome do fornecedor");
                return;
              }
              addQuotationMutation.mutate({
                purchaseRequestId: selectedRequest!,
                ...quotationForm,
                deliveryDays: quotationForm.deliveryDays ? parseInt(quotationForm.deliveryDays) : undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fornecedor *</Label>
                <Input
                  value={quotationForm.supplierName}
                  onChange={(e) => setQuotationForm({ ...quotationForm, supplierName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={quotationForm.supplierCnpj}
                  onChange={(e) => setQuotationForm({ ...quotationForm, supplierCnpj: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prazo de Entrega (dias)</Label>
                <Input
                  type="number"
                  value={quotationForm.deliveryDays}
                  onChange={(e) => setQuotationForm({ ...quotationForm, deliveryDays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Condição de Pagamento</Label>
                <Input
                  value={quotationForm.paymentCondition}
                  onChange={(e) => setQuotationForm({ ...quotationForm, paymentCondition: e.target.value })}
                  placeholder="Ex: 30/60/90 dias"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valores por Item</Label>
              {quotationForm.items.map((item, index) => {
                const requestItem = requestDetails?.items?.find((i: any) => i.id === item.requestItemId);
                return (
                  <div key={index} className="grid grid-cols-3 gap-2 items-center">
                    <span className="text-sm">{requestItem?.itemName}</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor unitário"
                      value={item.unitValue}
                      onChange={(e) => {
                        const newItems = [...quotationForm.items];
                        newItems[index].unitValue = e.target.value;
                        newItems[index].totalValue = (
                          Number(e.target.value) * Number(requestItem?.quantity || 0)
                        ).toFixed(2);
                        setQuotationForm({ ...quotationForm, items: newItems });
                      }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Valor total"
                      value={item.totalValue}
                      onChange={(e) => {
                        const newItems = [...quotationForm.items];
                        newItems[index].totalValue = e.target.value;
                        setQuotationForm({ ...quotationForm, items: newItems });
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={quotationForm.observations}
                onChange={(e) => setQuotationForm({ ...quotationForm, observations: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsQuotationModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addQuotationMutation.isPending}>
                {addQuotationMutation.isPending ? "Salvando..." : "Adicionar Cotação"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
