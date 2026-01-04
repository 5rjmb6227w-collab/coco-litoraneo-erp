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
import { Plus, Download, DollarSign, TrendingUp, TrendingDown, CheckCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function Financeiro() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [filters, setFilters] = useState({
    entryType: "",
    origin: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  const utils = trpc.useUtils();
  const { data: entries = [], isLoading } = trpc.financial.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );
  const { data: cashFlow = [] } = trpc.financial.getCashFlow.useQuery({ days: 30 });

  const createMutation = trpc.financial.create.useMutation({
    onSuccess: () => {
      toast.success("Lançamento criado com sucesso!");
      setIsModalOpen(false);
      utils.financial.list.invalidate();
      utils.financial.getCashFlow.invalidate();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const markAsPaidMutation = trpc.financial.markAsPaid.useMutation({
    onSuccess: () => {
      toast.success("Pagamento registrado!");
      setIsPayModalOpen(false);
      setSelectedEntry(null);
      utils.financial.list.invalidate();
      utils.financial.getCashFlow.invalidate();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const markAsReceivedMutation = trpc.financial.markAsReceived.useMutation({
    onSuccess: () => {
      toast.success("Recebimento registrado!");
      setIsPayModalOpen(false);
      setSelectedEntry(null);
      utils.financial.list.invalidate();
      utils.financial.getCashFlow.invalidate();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    entryType: "pagar" as "pagar" | "receber",
    origin: "outros" as "produtor" | "compra" | "venda" | "outros",
    description: "",
    entityName: "",
    value: "",
    dueDate: "",
    observations: "",
  });

  const [payForm, setPayForm] = useState({
    paymentMethod: "pix" as "pix" | "transferencia" | "boleto" | "dinheiro" | "cheque",
    observations: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.value || !formData.dueDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate(formData);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedEntry.entryType === "pagar") {
      markAsPaidMutation.mutate({
        id: selectedEntry.id,
        paymentMethod: payForm.paymentMethod,
        observations: payForm.observations || undefined,
      });
    } else {
      markAsReceivedMutation.mutate({
        id: selectedEntry.id,
        paymentMethod: payForm.paymentMethod,
        observations: payForm.observations || undefined,
      });
    }
  };

  const exportCSV = () => {
    const headers = ["Tipo", "Origem", "Descrição", "Entidade", "Valor", "Vencimento", "Status", "Data Pagamento"];
    const rows = entries.map((e) => [
      e.entryType === "pagar" ? "A Pagar" : "A Receber",
      originLabels[e.origin],
      e.description,
      e.entityName || "-",
      e.value,
      format(new Date(e.dueDate), "dd/MM/yyyy"),
      statusLabels[e.status],
      e.paidAt ? format(new Date(e.paidAt), "dd/MM/yyyy") : "-",
    ]);

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financeiro_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const originLabels: Record<string, string> = {
    produtor: "Produtor",
    compra: "Compra",
    venda: "Venda",
    outros: "Outros",
  };

  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    pago: "Pago",
    recebido: "Recebido",
    cancelado: "Cancelado",
  };

  const statusColors: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-800",
    pago: "bg-green-100 text-green-800",
    recebido: "bg-green-100 text-green-800",
    cancelado: "bg-gray-100 text-gray-600",
  };

  // Cálculos
  const today = startOfDay(new Date());
  const totalAPagar = entries
    .filter((e) => e.entryType === "pagar" && e.status === "pendente")
    .reduce((sum, e) => sum + Number(e.value), 0);
  const totalAReceber = entries
    .filter((e) => e.entryType === "receber" && e.status === "pendente")
    .reduce((sum, e) => sum + Number(e.value), 0);
  const vencidosAPagar = entries
    .filter((e) => e.entryType === "pagar" && e.status === "pendente" && isBefore(new Date(e.dueDate), today))
    .reduce((sum, e) => sum + Number(e.value), 0);
  const vencidosAReceber = entries
    .filter((e) => e.entryType === "receber" && e.status === "pendente" && isBefore(new Date(e.dueDate), today))
    .reduce((sum, e) => sum + Number(e.value), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie contas a pagar e a receber
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
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select
                      value={formData.entryType}
                      onValueChange={(v) => setFormData({ ...formData, entryType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pagar">A Pagar</SelectItem>
                        <SelectItem value="receber">A Receber</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <SelectItem value="produtor">Produtor</SelectItem>
                        <SelectItem value="compra">Compra</SelectItem>
                        <SelectItem value="venda">Venda</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do lançamento"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entidade (Fornecedor/Cliente)</Label>
                  <Input
                    value={formData.entityName}
                    onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
                    placeholder="Nome do fornecedor ou cliente"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento *</Label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Criar Lançamento"}
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
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              R$ {totalAPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            {vencidosAPagar > 0 && (
              <p className="text-xs text-red-500 mt-1">
                R$ {vencidosAPagar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} vencidos
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              R$ {totalAReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            {vencidosAReceber > 0 && (
              <p className="text-xs text-orange-500 mt-1">
                R$ {vencidosAReceber.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} vencidos
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Saldo Projetado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalAReceber - totalAPagar >= 0 ? "text-green-600" : "text-red-600"}`}>
              R$ {(totalAReceber - totalAPagar).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lançamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{entries.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {entries.filter((e) => e.status === "pendente").length} pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Lançamentos</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa (30 dias)</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={filters.entryType}
                    onValueChange={(v) => setFilters({ ...filters, entryType: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pagar">A Pagar</SelectItem>
                      <SelectItem value="receber">A Receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select
                    value={filters.origin}
                    onValueChange={(v) => setFilters({ ...filters, origin: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="produtor">Produtor</SelectItem>
                      <SelectItem value="compra">Compra</SelectItem>
                      <SelectItem value="venda">Venda</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="recebido">Recebido</SelectItem>
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
                  onClick={() => setFilters({ entryType: "", origin: "", status: "", startDate: "", endDate: "" })}
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
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
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum lançamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => {
                      const isOverdue = entry.status === "pendente" && isBefore(new Date(entry.dueDate), today);
                      return (
                        <TableRow key={entry.id} className={isOverdue ? "bg-red-50" : ""}>
                          <TableCell>
                            <Badge variant={entry.entryType === "pagar" ? "destructive" : "default"}>
                              {entry.entryType === "pagar" ? "Pagar" : "Receber"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {entry.description}
                          </TableCell>
                          <TableCell>{entry.entityName || "-"}</TableCell>
                          <TableCell>{originLabels[entry.origin]}</TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {Number(entry.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>
                            {format(new Date(entry.dueDate), "dd/MM/yyyy")}
                            {isOverdue && <span className="text-xs ml-1">(Vencido)</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[entry.status]}>
                              {statusLabels[entry.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.status === "pendente" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEntry(entry);
                                  setPayForm({ paymentMethod: "pix", observations: "" });
                                  setIsPayModalOpen(true);
                                }}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {entry.entryType === "pagar" ? "Pagar" : "Receber"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Projeção de Fluxo de Caixa - Próximos 30 dias</CardTitle>
            </CardHeader>
            <CardContent>
              {cashFlow.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum lançamento pendente nos próximos 30 dias
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Semana</TableHead>
                      <TableHead className="text-right text-red-600">Saídas</TableHead>
                      <TableHead className="text-right text-green-600">Entradas</TableHead>
                      <TableHead className="text-right">Saldo Acumulado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      let runningBalance = 0;
                      return cashFlow.map((item: any, index: number) => {
                        // getCashFlowProjection retorna weeks com weekStart/weekEnd/entradas/saidas
                        const saida = Number(item.saidas) || 0;
                        const entrada = Number(item.entradas) || 0;
                        runningBalance += entrada - saida;
                        
                        // Formatar período da semana
                        const weekStartDate = item.weekStart ? new Date(item.weekStart) : null;
                        const weekEndDate = item.weekEnd ? new Date(item.weekEnd) : null;
                        const periodoLabel = weekStartDate && weekEndDate && !isNaN(weekStartDate.getTime()) && !isNaN(weekEndDate.getTime())
                          ? `${format(weekStartDate, "dd/MM")} - ${format(weekEndDate, "dd/MM")}`
                          : `Semana ${index + 1}`;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              {periodoLabel}
                            </TableCell>
                            <TableCell>Semana {index + 1}</TableCell>
                            <TableCell className="text-right text-red-600">
                              {saida > 0 ? `R$ ${saida.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {entrada > 0 ? `R$ ${entrada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${runningBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                              R$ {runningBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Pagamento/Recebimento */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEntry?.entryType === "pagar" ? "Registrar Pagamento" : "Registrar Recebimento"}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <form onSubmit={handlePay} className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium">{selectedEntry.description}</p>
                <p className="text-2xl font-bold mt-2">
                  R$ {Number(selectedEntry.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  Vencimento: {format(new Date(selectedEntry.dueDate), "dd/MM/yyyy")}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select
                  value={payForm.paymentMethod}
                  onValueChange={(v) => setPayForm({ ...payForm, paymentMethod: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={payForm.observations}
                  onChange={(e) => setPayForm({ ...payForm, observations: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsPayModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={markAsPaidMutation.isPending || markAsReceivedMutation.isPending}
                >
                  {markAsPaidMutation.isPending || markAsReceivedMutation.isPending
                    ? "Salvando..."
                    : selectedEntry.entryType === "pagar"
                    ? "Confirmar Pagamento"
                    : "Confirmar Recebimento"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
