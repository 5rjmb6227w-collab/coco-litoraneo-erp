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
import { Search, Download, Wallet, Eye, Check, Calendar, CreditCard, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Pagamentos() {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [producerFilter, setProducerFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form state for editing
  const [formData, setFormData] = useState({
    pricePerKg: "",
    discountPercent: "",
    dueDate: "",
    paymentMethod: "" as "" | "pix" | "transferencia" | "boleto" | "dinheiro" | "cheque",
    observations: "",
  });

  // Queries
  const { data: payables, refetch } = trpc.producerPayables.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    producerId: producerFilter !== "all" ? parseInt(producerFilter) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Paginação
  const filteredPayables = payables || [];
  const totalPages = Math.ceil(filteredPayables.length / itemsPerPage);
  const paginatedPayables = filteredPayables.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset para página 1 quando filtros mudam
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Limpar filtros de data
  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };
  const { data: producers } = trpc.producers.list.useQuery({});

  // Mutations
  const updateMutation = trpc.producerPayables.update.useMutation({
    onSuccess: () => {
      toast.success("Pagamento atualizado com sucesso!");
      setIsViewModalOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar pagamento: " + error.message);
    },
  });

  const getProducerName = (producerId: number) => {
    return producers?.find(p => p.id === producerId)?.name || "Desconhecido";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case "aprovado":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Aprovado</Badge>;
      case "programado":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Programado</Badge>;
      case "pago":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pago</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case "pix": return "PIX";
      case "transferencia": return "Transferência";
      case "boleto": return "Boleto";
      case "dinheiro": return "Dinheiro";
      case "cheque": return "Cheque";
      default: return "-";
    }
  };

  const openViewModal = (payable: any) => {
    setSelectedPayable(payable);
    setFormData({
      pricePerKg: payable.pricePerKg,
      discountPercent: payable.discountPercent || "0",
      dueDate: payable.dueDate || "",
      paymentMethod: payable.paymentMethod || "",
      observations: payable.observations || "",
    });
    setIsViewModalOpen(true);
  };

  const handleStatusChange = (newStatus: "aprovado" | "programado" | "pago") => {
    if (!selectedPayable) return;

    const updateData: any = {
      id: selectedPayable.id,
      status: newStatus,
    };

    // Include form data if values changed
    if (formData.pricePerKg !== selectedPayable.pricePerKg) {
      updateData.pricePerKg = formData.pricePerKg;
    }
    if (formData.discountPercent !== (selectedPayable.discountPercent || "0")) {
      updateData.discountPercent = formData.discountPercent;
    }
    if (formData.dueDate && formData.dueDate !== selectedPayable.dueDate) {
      updateData.dueDate = formData.dueDate;
    }
    if (formData.paymentMethod) {
      updateData.paymentMethod = formData.paymentMethod;
    }
    if (formData.observations) {
      updateData.observations = formData.observations;
    }

    updateMutation.mutate(updateData);
  };

  const handleSaveChanges = () => {
    if (!selectedPayable) return;

    updateMutation.mutate({
      id: selectedPayable.id,
      pricePerKg: formData.pricePerKg,
      discountPercent: formData.discountPercent,
      dueDate: formData.dueDate || undefined,
      paymentMethod: formData.paymentMethod || undefined,
      observations: formData.observations || undefined,
    });
  };

  const exportCSV = () => {
    if (!payables || payables.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = ["company_code", "entity_id", "carga_id", "produtor", "peso_liquido", "preco_kg", "desconto_percent", "peso_pagar", "valor_total", "vencimento", "status", "metodo_pagamento", "created_at"];
    const rows = payables.map(p => [
      "COCO_LITORANEO",
      p.id,
      p.coconutLoadId,
      getProducerName(p.producerId),
      p.netWeight,
      p.pricePerKg,
      p.discountPercent || "0",
      p.payableWeight,
      p.totalValue,
      p.dueDate || "",
      p.status,
      p.paymentMethod || "",
      p.createdAt ? format(new Date(p.createdAt), "yyyy-MM-dd'T'HH:mm:ss") : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos_produtores_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Arquivo exportado com sucesso!");
  };

  // Calculate totals
  const totalPendente = payables?.filter(p => p.status === "pendente").reduce((acc, p) => acc + Number(p.totalValue), 0) || 0;
  const totalAprovado = payables?.filter(p => p.status === "aprovado").reduce((acc, p) => acc + Number(p.totalValue), 0) || 0;
  const totalProgramado = payables?.filter(p => p.status === "programado").reduce((acc, p) => acc + Number(p.totalValue), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagamentos a Produtores</h1>
          <p className="text-muted-foreground">Gerencie os pagamentos das cargas de coco</p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Wallet className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendente)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payables?.filter(p => p.status === "pendente").length || 0} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            <Check className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAprovado)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payables?.filter(p => p.status === "aprovado").length || 0} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programados</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProgramado)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payables?.filter(p => p.status === "programado").length || 0} pagamentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Linha 1: Filtros principais */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={producerFilter} onValueChange={(v) => { setProducerFilter(v); handleFilterChange(); }}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Produtor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtores</SelectItem>
                  {producers?.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id.toString()}>
                      {producer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); handleFilterChange(); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="programado">Programado</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
            
            {/* Linha 2: Filtro por período */}
            <div className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="font-medium">Período de Vencimento:</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="space-y-1">
                  <Label htmlFor="startDate" className="text-xs text-muted-foreground">Data Inicial</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); handleFilterChange(); }}
                    className="w-full sm:w-[160px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate" className="text-xs text-muted-foreground">Data Final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); handleFilterChange(); }}
                    className="w-full sm:w-[160px]"
                  />
                </div>
              </div>
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilters} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
              {(startDate || endDate) && (
                <Badge variant="secondary" className="ml-auto">
                  {filteredPayables.length} resultado{filteredPayables.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carga</TableHead>
                  <TableHead>Produtor</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">R$/kg</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayables && paginatedPayables.length > 0 ? (
                  paginatedPayables.map((payable) => (
                    <TableRow key={payable.id}>
                      <TableCell className="font-mono">#{payable.coconutLoadId}</TableCell>
                      <TableCell className="font-medium">{getProducerName(payable.producerId)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(payable.payableWeight).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(payable.pricePerKg).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(payable.totalValue))}
                      </TableCell>
                      <TableCell>
                        {payable.dueDate && !isNaN(new Date(payable.dueDate + 'T00:00:00').getTime()) 
                          ? format(new Date(payable.dueDate + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) 
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(payable.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewModal(payable)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento registrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredPayables.length)} de {filteredPayables.length} pagamentos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Visualizar/Editar Pagamento */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
            <DialogDescription>
              Visualize e gerencie o pagamento ao produtor
            </DialogDescription>
          </DialogHeader>
          {selectedPayable && (
            <div className="space-y-4 py-4">
              {/* Info da carga */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-muted-foreground text-xs">Carga</Label>
                  <p className="font-mono font-medium">#{selectedPayable.coconutLoadId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Produtor</Label>
                  <p className="font-medium">{getProducerName(selectedPayable.producerId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Peso Líquido</Label>
                  <p className="font-mono">{Number(selectedPayable.netWeight).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPayable.status)}</div>
                </div>
              </div>

              {/* Campos editáveis */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerKg">Preço por kg (R$)</Label>
                  <Input
                    id="pricePerKg"
                    type="number"
                    step="0.01"
                    value={formData.pricePerKg}
                    onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                    disabled={selectedPayable.status === "pago"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountPercent">Desconto (%)</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    step="0.1"
                    value={formData.discountPercent}
                    onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                    disabled={selectedPayable.status === "pago"}
                  />
                </div>
              </div>

              {/* Cálculo */}
              <div className="p-4 bg-primary/5 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Peso líquido:</span>
                  <span className="font-mono">{Number(selectedPayable.netWeight).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Desconto ({formData.discountPercent}%):</span>
                  <span className="font-mono text-destructive">
                    -{(Number(selectedPayable.netWeight) * Number(formData.discountPercent) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Peso a pagar:</span>
                  <span className="font-mono">
                    {(Number(selectedPayable.netWeight) * (1 - Number(formData.discountPercent) / 100)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Valor Total:</span>
                  <span className="font-mono text-primary text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      Number(selectedPayable.netWeight) * (1 - Number(formData.discountPercent) / 100) * Number(formData.pricePerKg)
                    )}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Data de Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    disabled={selectedPayable.status === "pago"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: "pix" | "transferencia" | "boleto" | "dinheiro" | "cheque") => setFormData({ ...formData, paymentMethod: value })}
                    disabled={selectedPayable.status === "pago"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Observações sobre o pagamento..."
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  disabled={selectedPayable.status === "pago"}
                />
              </div>

              {/* Histórico de status */}
              <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
                <p>Criado em: {selectedPayable.createdAt && !isNaN(new Date(selectedPayable.createdAt).getTime()) 
                  ? format(new Date(selectedPayable.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) 
                  : "-"}</p>
                {selectedPayable.approvedAt && !isNaN(new Date(selectedPayable.approvedAt).getTime()) && (
                  <p>Aprovado em: {format(new Date(selectedPayable.approvedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                )}
                {selectedPayable.scheduledAt && !isNaN(new Date(selectedPayable.scheduledAt).getTime()) && (
                  <p>Programado em: {format(new Date(selectedPayable.scheduledAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                )}
                {selectedPayable.paidAt && !isNaN(new Date(selectedPayable.paidAt).getTime()) && (
                  <p>Pago em: {format(new Date(selectedPayable.paidAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
            {selectedPayable?.status !== "pago" && (
              <>
                <Button variant="outline" onClick={handleSaveChanges} disabled={updateMutation.isPending}>
                  Salvar Alterações
                </Button>
                {selectedPayable?.status === "pendente" && (
                  <Button onClick={() => handleStatusChange("aprovado")} disabled={updateMutation.isPending}>
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                )}
                {selectedPayable?.status === "aprovado" && (
                  <Button onClick={() => handleStatusChange("programado")} disabled={updateMutation.isPending}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Programar
                  </Button>
                )}
                {selectedPayable?.status === "programado" && (
                  <Button onClick={() => handleStatusChange("pago")} disabled={updateMutation.isPending} className="bg-green-600 hover:bg-green-700">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Confirmar Pagamento
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
