import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Building2, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight,
  Edit2, Trash2, Wallet, TrendingUp, TrendingDown, CheckCircle2,
  MoreHorizontal, CreditCard, Banknote, PiggyBank, DollarSign, Database
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  corrente: "Conta Corrente",
  poupanca: "Poupança",
  investimento: "Investimento",
  caixa: "Caixa",
};

const ACCOUNT_TYPE_ICONS: Record<string, typeof Building2> = {
  corrente: Building2,
  poupanca: PiggyBank,
  investimento: TrendingUp,
  caixa: Banknote,
};

const TXN_TYPE_LABELS: Record<string, string> = {
  credito: "Crédito",
  debito: "Débito",
  transferencia: "Transferência",
};

const CATEGORY_LABELS: Record<string, string> = {
  receita_vendas: "Receita de Vendas",
  receita_outros: "Outras Receitas",
  pagamento_produtor: "Pgto Produtor",
  pagamento_fornecedor: "Pgto Fornecedor",
  pagamento_funcionario: "Pgto Funcionário",
  pagamento_imposto: "Pgto Imposto",
  pagamento_servico: "Pgto Serviço",
  tarifa_bancaria: "Tarifa Bancária",
  transferencia_entre_contas: "Transferência",
  rendimento: "Rendimento",
  emprestimo: "Empréstimo",
  investimento: "Investimento",
  outros: "Outros",
};

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export default function FinanceBancos() {
  const [activeTab, setActiveTab] = useState("contas");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();

  const [accountForm, setAccountForm] = useState({
    bankName: "",
    bankCode: "",
    agency: "",
    accountNumber: "",
    accountType: "corrente" as "corrente" | "poupanca" | "investimento" | "caixa",
    accountHolder: "",
    cnpjCpf: "",
    pixKey: "",
    initialBalance: "0",
    color: "#3b82f6",
    notes: "",
  });

  const [txnForm, setTxnForm] = useState({
    bankAccountId: 0,
    type: "debito" as "credito" | "debito" | "transferencia",
    category: "outros" as "receita_vendas" | "receita_outros" | "pagamento_produtor" | "pagamento_fornecedor" | "pagamento_funcionario" | "pagamento_imposto" | "pagamento_servico" | "tarifa_bancaria" | "transferencia_entre_contas" | "rendimento" | "emprestimo" | "investimento" | "outros",
    description: "",
    amount: "",
    transactionDate: new Date().toISOString().split("T")[0],
    competenceDate: "",
    documentNumber: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const accountsQuery = trpc.finance.bankAccounts.list.useQuery({ isActive: true });
  const summaryQuery = trpc.finance.bankAccounts.getSummary.useQuery();
  const txnsQuery = trpc.finance.bankTransactions.list.useQuery(
    selectedAccountId ? { bankAccountId: selectedAccountId, limit: 100 } : { limit: 100 }
  );

  const createAccountMutation = trpc.finance.bankAccounts.create.useMutation({
    onSuccess: () => {
      toast.success("Conta bancária criada com sucesso");
      utils.finance.bankAccounts.invalidate();
      utils.finance.bankTransactions.invalidate();
      setShowAccountModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateAccountMutation = trpc.finance.bankAccounts.update.useMutation({
    onSuccess: () => {
      toast.success("Conta bancária atualizada");
      utils.finance.bankAccounts.invalidate();
      setShowAccountModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAccountMutation = trpc.finance.bankAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success("Conta bancária excluída");
      utils.finance.bankAccounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createTxnMutation = trpc.finance.bankTransactions.create.useMutation({
    onSuccess: () => {
      toast.success("Movimentação registrada com sucesso");
      utils.finance.bankTransactions.invalidate();
      utils.finance.bankAccounts.invalidate();
      setShowTxnModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteTxnMutation = trpc.finance.bankTransactions.delete.useMutation({
    onSuccess: () => {
      toast.success("Movimentação excluída");
      utils.finance.bankTransactions.invalidate();
      utils.finance.bankAccounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const reconcileMutation = trpc.finance.bankTransactions.reconcile.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} movimentação(ões) conciliada(s)`);
      utils.finance.bankTransactions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const seedAccountsMutation = trpc.finance.bankAccounts.seedDefault.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.totalAccounts} contas bancárias padrão criadas`);
      utils.finance.bankAccounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const accounts = accountsQuery.data || [];
  const summary = summaryQuery.data;
  const transactions = txnsQuery.data || [];

  const totalCredits = useMemo(() =>
    transactions.filter(t => t.type === "credito").reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );
  const totalDebits = useMemo(() =>
    transactions.filter(t => t.type === "debito").reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  function openNewAccount() {
    setEditingAccount(null);
    setAccountForm({
      bankName: "", bankCode: "", agency: "", accountNumber: "",
      accountType: "corrente" as "corrente" | "poupanca" | "investimento" | "caixa", accountHolder: "", cnpjCpf: "", pixKey: "",
      initialBalance: "0", color: "#3b82f6", notes: "",
    });
    setShowAccountModal(true);
  }

  function openEditAccount(acc: any) {
    setEditingAccount(acc);
    setAccountForm({
      bankName: acc.bankName,
      bankCode: acc.bankCode || "",
      agency: acc.agency || "",
      accountNumber: acc.accountNumber,
      accountType: acc.accountType as "corrente" | "poupanca" | "investimento" | "caixa",
      accountHolder: acc.accountHolder || "",
      cnpjCpf: acc.cnpjCpf || "",
      pixKey: acc.pixKey || "",
      initialBalance: String(acc.initialBalance),
      color: acc.color || "#3b82f6",
      notes: acc.notes || "",
    });
    setShowAccountModal(true);
  }

  function handleAccountSubmit() {
    const payload = {
      ...accountForm,
      accountType: accountForm.accountType as "corrente" | "poupanca" | "investimento" | "caixa",
    };
    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount.id, ...payload });
    } else {
      createAccountMutation.mutate(payload);
    }
  }

  function openNewTxn(accountId?: number) {
    setTxnForm({
      bankAccountId: accountId || (accounts[0]?.id || 0),
      type: "debito" as "credito" | "debito" | "transferencia", category: "outros" as "receita_vendas" | "receita_outros" | "pagamento_produtor" | "pagamento_fornecedor" | "pagamento_funcionario" | "pagamento_imposto" | "pagamento_servico" | "tarifa_bancaria" | "transferencia_entre_contas" | "rendimento" | "emprestimo" | "investimento" | "outros", description: "",
      amount: "", transactionDate: new Date().toISOString().split("T")[0],
      competenceDate: "", documentNumber: "", notes: "",
    });
    setShowTxnModal(true);
  }

  function handleTxnSubmit() {
    createTxnMutation.mutate({
      ...txnForm,
      type: txnForm.type as "credito" | "debito" | "transferencia",
      category: txnForm.category as typeof txnForm.category,
      competenceDate: txnForm.competenceDate || undefined,
      documentNumber: txnForm.documentNumber || undefined,
      notes: txnForm.notes || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Contas Bancárias e Movimentações
          </h1>
          <p className="text-muted-foreground mt-1">Gestão financeira de contas e transações</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="h-4 w-4" /> Saldo Total
            </div>
            <div className={`text-2xl font-bold ${(summary?.totalBalance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary?.totalBalance || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <CreditCard className="h-4 w-4" /> Contas Ativas
            </div>
            <div className="text-2xl font-bold">{summary?.totalAccounts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ArrowUpCircle className="h-4 w-4 text-green-500" /> Créditos (Período)
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCredits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ArrowDownCircle className="h-4 w-4 text-red-500" /> Débitos (Período)
            </div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDebits)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contas">Contas Bancárias</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        {/* TAB: CONTAS BANCÁRIAS */}
        <TabsContent value="contas" className="space-y-4">
          <div className="flex justify-end gap-2">
            {accounts.length === 0 && (
              <Button variant="outline" onClick={() => seedAccountsMutation.mutate()} disabled={seedAccountsMutation.isPending}>
                <Database className="h-4 w-4 mr-2" />
                {seedAccountsMutation.isPending ? "Criando..." : "Carregar Contas Padrão"}
              </Button>
            )}
            <Button onClick={openNewAccount}>
              <Plus className="h-4 w-4 mr-2" /> Nova Conta
            </Button>
          </div>

          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhuma conta bancária</h3>
                <p className="text-muted-foreground mt-1">Adicione sua primeira conta bancária para começar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((acc) => {
                const Icon = ACCOUNT_TYPE_ICONS[acc.accountType] || Building2;
                return (
                  <Card key={acc.id} className="relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: acc.color || "#3b82f6" }} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-base">{acc.bankName}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditAccount(acc)}>
                              <Edit2 className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedAccountId(acc.id); setActiveTab("movimentacoes"); }}>
                              <ArrowLeftRight className="h-4 w-4 mr-2" /> Ver Movimentações
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openNewTxn(acc.id)}>
                              <Plus className="h-4 w-4 mr-2" /> Nova Movimentação
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => {
                              if (confirm("Excluir esta conta?")) deleteAccountMutation.mutate({ id: acc.id });
                            }}>
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge variant="outline">{ACCOUNT_TYPE_LABELS[acc.accountType]}</Badge>
                        {acc.agency && <p className="text-xs text-muted-foreground">Ag: {acc.agency} | CC: {acc.accountNumber}</p>}
                        {acc.pixKey && <p className="text-xs text-muted-foreground">PIX: {acc.pixKey}</p>}
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">Saldo Atual</p>
                          <p className={`text-xl font-bold ${Number(acc.currentBalance) >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(acc.currentBalance)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB: MOVIMENTAÇÕES */}
        <TabsContent value="movimentacoes" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={selectedAccountId ? String(selectedAccountId) : "all"}
                onValueChange={(v) => setSelectedAccountId(v === "all" ? undefined : Number(v))}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.bankName} - {acc.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openNewTxn(selectedAccountId)}>
              <Plus className="h-4 w-4 mr-2" /> Nova Movimentação
            </Button>
          </div>

          {transactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhuma movimentação</h3>
                <p className="text-muted-foreground mt-1">Registre a primeira movimentação bancária.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Data</th>
                        <th className="text-left p-3">Descrição</th>
                        <th className="text-left p-3">Categoria</th>
                        <th className="text-left p-3">Tipo</th>
                        <th className="text-right p-3">Valor</th>
                        <th className="text-right p-3">Saldo</th>
                        <th className="text-center p-3">Conc.</th>
                        <th className="text-center p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 whitespace-nowrap">
                            {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString("pt-BR") : "-"}
                          </td>
                          <td className="p-3">
                            <div>{txn.description}</div>
                            {txn.documentNumber && (
                              <span className="text-xs text-muted-foreground">Doc: {txn.documentNumber}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABELS[txn.category] || txn.category}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {txn.type === "credito" && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <ArrowUpCircle className="h-3 w-3 mr-1" /> Crédito
                              </Badge>
                            )}
                            {txn.type === "debito" && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                <ArrowDownCircle className="h-3 w-3 mr-1" /> Débito
                              </Badge>
                            )}
                            {txn.type === "transferencia" && (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                <ArrowLeftRight className="h-3 w-3 mr-1" /> Transf.
                              </Badge>
                            )}
                          </td>
                          <td className={`p-3 text-right font-mono font-medium ${
                            txn.type === "credito" ? "text-green-600" : "text-red-600"
                          }`}>
                            {txn.type === "credito" ? "+" : "-"}{formatCurrency(txn.amount)}
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            {txn.balanceAfter ? formatCurrency(txn.balanceAfter) : "-"}
                          </td>
                          <td className="p-3 text-center">
                            {txn.reconciled ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => reconcileMutation.mutate({ ids: [txn.id] })}
                              >
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {!txn.reconciled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => {
                                  if (confirm("Excluir esta movimentação?")) deleteTxnMutation.mutate({ id: txn.id });
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal: Conta Bancária */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Editar Conta Bancária" : "Nova Conta Bancária"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Banco *</Label>
                <Input value={accountForm.bankName} onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })} placeholder="Banco do Brasil" />
              </div>
              <div>
                <Label>Código do Banco</Label>
                <Input value={accountForm.bankCode} onChange={(e) => setAccountForm({ ...accountForm, bankCode: e.target.value })} placeholder="001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Agência</Label>
                <Input value={accountForm.agency} onChange={(e) => setAccountForm({ ...accountForm, agency: e.target.value })} placeholder="1234-5" />
              </div>
              <div>
                <Label>Número da Conta *</Label>
                <Input value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} placeholder="12345-6" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Conta *</Label>
                <Select value={accountForm.accountType} onValueChange={(v) => setAccountForm({ ...accountForm, accountType: v as "corrente" | "poupanca" | "investimento" | "caixa" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor</Label>
                <Input type="color" value={accountForm.color} onChange={(e) => setAccountForm({ ...accountForm, color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Titular</Label>
              <Input value={accountForm.accountHolder} onChange={(e) => setAccountForm({ ...accountForm, accountHolder: e.target.value })} placeholder="Coco Litorâneo LTDA" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CNPJ/CPF</Label>
                <Input value={accountForm.cnpjCpf} onChange={(e) => setAccountForm({ ...accountForm, cnpjCpf: e.target.value })} placeholder="00.000.000/0001-00" />
              </div>
              <div>
                <Label>Chave PIX</Label>
                <Input value={accountForm.pixKey} onChange={(e) => setAccountForm({ ...accountForm, pixKey: e.target.value })} placeholder="email@empresa.com" />
              </div>
            </div>
            {!editingAccount && (
              <div>
                <Label>Saldo Inicial (R$)</Label>
                <Input type="number" step="0.01" value={accountForm.initialBalance} onChange={(e) => setAccountForm({ ...accountForm, initialBalance: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Observações</Label>
              <Input value={accountForm.notes} onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })} placeholder="Observações opcionais" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountModal(false)}>Cancelar</Button>
            <Button onClick={handleAccountSubmit} disabled={createAccountMutation.isPending || updateAccountMutation.isPending || !accountForm.bankName || !accountForm.accountNumber}>
              {editingAccount ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Movimentação */}
      <Dialog open={showTxnModal} onOpenChange={setShowTxnModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Movimentação Bancária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Conta Bancária *</Label>
              <Select value={String(txnForm.bankAccountId)} onValueChange={(v) => setTxnForm({ ...txnForm, bankAccountId: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.bankName} - {acc.accountNumber} ({formatCurrency(acc.currentBalance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={txnForm.type} onValueChange={(v) => setTxnForm({ ...txnForm, type: v as "credito" | "debito" | "transferencia" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credito">Crédito (Entrada)</SelectItem>
                    <SelectItem value="debito">Débito (Saída)</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={txnForm.category} onValueChange={(v) => setTxnForm({ ...txnForm, category: v as typeof txnForm.category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input value={txnForm.description} onChange={(e) => setTxnForm({ ...txnForm, description: e.target.value })} placeholder="Descrição da movimentação" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0.01" value={txnForm.amount} onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={txnForm.transactionDate} onChange={(e) => setTxnForm({ ...txnForm, transactionDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Competência</Label>
                <Input type="date" value={txnForm.competenceDate} onChange={(e) => setTxnForm({ ...txnForm, competenceDate: e.target.value })} />
              </div>
              <div>
                <Label>Nº Documento</Label>
                <Input value={txnForm.documentNumber} onChange={(e) => setTxnForm({ ...txnForm, documentNumber: e.target.value })} placeholder="NF 12345" />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={txnForm.notes} onChange={(e) => setTxnForm({ ...txnForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTxnModal(false)}>Cancelar</Button>
            <Button onClick={handleTxnSubmit} disabled={createTxnMutation.isPending || !txnForm.description || !txnForm.amount || !txnForm.bankAccountId}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
