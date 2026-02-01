import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Save, 
  Send,
  Calculator,
  Building2,
  Users,
  Wrench,
  Truck,
  Monitor,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Trash2
} from "lucide-react";

const COST_CENTERS = [
  { id: "producao", name: "Produção", icon: Building2, color: "bg-blue-500" },
  { id: "comercial", name: "Comercial", icon: TrendingUp, color: "bg-green-500" },
  { id: "administrativo", name: "Administrativo", icon: FileSpreadsheet, color: "bg-purple-500" },
  { id: "rh", name: "RH", icon: Users, color: "bg-orange-500" },
  { id: "manutencao", name: "Manutenção", icon: Wrench, color: "bg-red-500" },
  { id: "qualidade", name: "Qualidade", icon: ShieldCheck, color: "bg-teal-500" },
  { id: "logistica", name: "Logística", icon: Truck, color: "bg-yellow-500" },
  { id: "ti", name: "TI", icon: Monitor, color: "bg-indigo-500" },
];

const CATEGORIES = {
  receita: [
    { id: "receita_vendas", name: "Vendas de Produtos" },
    { id: "receita_servicos", name: "Serviços" },
    { id: "receita_outras", name: "Outras Receitas" },
  ],
  custo: [
    { id: "custo_materia_prima", name: "Matéria-Prima" },
    { id: "custo_mao_obra_direta", name: "Mão de Obra Direta" },
    { id: "custo_energia", name: "Energia" },
    { id: "custo_embalagem", name: "Embalagem" },
  ],
  despesa: [
    { id: "despesa_pessoal", name: "Pessoal" },
    { id: "despesa_aluguel", name: "Aluguel" },
    { id: "despesa_utilidades", name: "Utilidades" },
    { id: "despesa_marketing", name: "Marketing" },
    { id: "despesa_manutencao", name: "Manutenção" },
    { id: "despesa_transporte", name: "Transporte" },
    { id: "despesa_administrativa", name: "Administrativa" },
    { id: "despesa_outras", name: "Outras Despesas" },
  ],
  investimento: [
    { id: "investimento_equipamento", name: "Equipamentos" },
    { id: "investimento_infraestrutura", name: "Infraestrutura" },
    { id: "investimento_tecnologia", name: "Tecnologia" },
    { id: "investimento_outros", name: "Outros Investimentos" },
  ],
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function OrcamentoPreparacao() {
  // toast from sonner
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [showNewBudgetDialog, setShowNewBudgetDialog] = useState(false);
  const [showNewLineDialog, setShowNewLineDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("visao-geral");
  
  // Form states
  const [newBudget, setNewBudget] = useState({
    name: "",
    year: new Date().getFullYear(),
    type: "anual" as const,
    scenario: "moderado" as const,
    observations: "",
  });
  
  const [newLine, setNewLine] = useState({
    costCenter: "",
    category: "",
    description: "",
    isCapex: false,
    jan: "0", fev: "0", mar: "0", abr: "0", mai: "0", jun: "0",
    jul: "0", ago: "0", set: "0", out: "0", nov: "0", dez: "0",
    justification: "",
    priority: "importante" as const,
  });
  
  const [importSettings, setImportSettings] = useState({
    baseYear: new Date().getFullYear() - 1,
    adjustmentPercent: 5,
  });

  // Queries
  const { data: budgets, refetch: refetchBudgets } = trpc.budget.list.useQuery({ year: selectedYear });
  const { data: budgetLines, refetch: refetchLines } = trpc.budget.lines.list.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );
  const { data: budgetDashboard } = trpc.budget.dashboard.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );

  // Mutations
  const createBudgetMutation = trpc.budget.create.useMutation({
    onSuccess: (data) => {
      toast.success("Orçamento criado com sucesso!");
      setShowNewBudgetDialog(false);
      setSelectedBudgetId(data.id);
      refetchBudgets();
    },
    onError: () => {
      toast.error("Erro ao criar orçamento");
    },
  });

  const createLineMutation = trpc.budget.lines.create.useMutation({
    onSuccess: () => {
      toast.success("Linha adicionada com sucesso!");
      setShowNewLineDialog(false);
      refetchLines();
      resetNewLine();
    },
    onError: () => {
      toast.error("Erro ao adicionar linha");
    },
  });

  const importMutation = trpc.budget.importFromPreviousYear.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`${data.linesImported} linhas importadas com sucesso!`);
        setShowImportDialog(false);
        refetchLines();
      } else {
        toast.error(data.message || "Erro ao importar");
      }
    },
    onError: () => {
      toast.error("Erro ao importar histórico");
    },
  });

  const startApprovalMutation = trpc.budget.approvals.start.useMutation({
    onSuccess: () => {
      toast.success("Orçamento enviado para aprovação!");
      refetchBudgets();
    },
    onError: () => {
      toast.error("Erro ao enviar para aprovação");
    },
  });

  const deleteLineMutation = trpc.budget.lines.delete.useMutation({
    onSuccess: () => {
      toast.success("Linha removida com sucesso!");
      refetchLines();
    },
    onError: () => {
      toast.error("Erro ao remover linha");
    },
  });

  const resetNewLine = () => {
    setNewLine({
      costCenter: "",
      category: "",
      description: "",
      isCapex: false,
      jan: "0", fev: "0", mar: "0", abr: "0", mai: "0", jun: "0",
      jul: "0", ago: "0", set: "0", out: "0", nov: "0", dez: "0",
      justification: "",
      priority: "importante",
    });
  };

  const handleCreateBudget = () => {
    createBudgetMutation.mutate(newBudget);
  };

  const handleCreateLine = () => {
    if (!selectedBudgetId) return;
    createLineMutation.mutate({
      budgetId: selectedBudgetId,
      ...newLine,
      costCenter: newLine.costCenter as any,
    });
  };

  const handleImport = () => {
    if (!selectedBudgetId) return;
    importMutation.mutate({
      budgetId: selectedBudgetId,
      baseYear: importSettings.baseYear,
      adjustmentPercent: importSettings.adjustmentPercent,
    });
  };

  const handleSendForApproval = () => {
    if (!selectedBudgetId) return;
    startApprovalMutation.mutate({ budgetId: selectedBudgetId });
  };

  const calculateLineTotal = (line: typeof newLine) => {
    return Number(line.jan) + Number(line.fev) + Number(line.mar) +
      Number(line.abr) + Number(line.mai) + Number(line.jun) +
      Number(line.jul) + Number(line.ago) + Number(line.set) +
      Number(line.out) + Number(line.nov) + Number(line.dez);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      rascunho: { label: "Rascunho", variant: "secondary" },
      em_aprovacao: { label: "Em Aprovação", variant: "default" },
      aprovado: { label: "Aprovado", variant: "default" },
      revisao: { label: "Em Revisão", variant: "destructive" },
      encerrado: { label: "Encerrado", variant: "outline" },
    };
    const s = statusMap[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const selectedBudget = budgets?.find((b: any) => b.id === selectedBudgetId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Preparação do Orçamento</h1>
            <p className="text-muted-foreground">
              Crie e gerencie orçamentos anuais por centro de custo
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={showNewBudgetDialog} onOpenChange={setShowNewBudgetDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Orçamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Orçamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Orçamento</Label>
                    <Input
                      value={newBudget.name}
                      onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                      placeholder="Ex: Orçamento Anual 2026"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ano</Label>
                      <Select value={newBudget.year.toString()} onValueChange={(v) => setNewBudget({ ...newBudget, year: Number(v) })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026, 2027].map((year) => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={newBudget.type} onValueChange={(v: any) => setNewBudget({ ...newBudget, type: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="anual">Anual</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                          <SelectItem value="trimestral">Trimestral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Cenário</Label>
                    <Select value={newBudget.scenario} onValueChange={(v: any) => setNewBudget({ ...newBudget, scenario: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conservador">Conservador</SelectItem>
                        <SelectItem value="moderado">Moderado</SelectItem>
                        <SelectItem value="otimista">Otimista</SelectItem>
                        <SelectItem value="base_zero">Base Zero (OBZ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={newBudget.observations}
                      onChange={(e) => setNewBudget({ ...newBudget, observations: e.target.value })}
                      placeholder="Observações sobre este orçamento..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewBudgetDialog(false)}>Cancelar</Button>
                  <Button onClick={handleCreateBudget} disabled={!newBudget.name}>Criar Orçamento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Budget Selector */}
        {budgets && budgets.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Orçamentos de {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {budgets.map((budget: any) => (
                  <Button
                    key={budget.id}
                    variant={selectedBudgetId === budget.id ? "default" : "outline"}
                    onClick={() => setSelectedBudgetId(budget.id)}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {budget.name}
                    {getStatusBadge(budget.status)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget Content */}
        {selectedBudgetId && selectedBudget && (
          <>
            {/* Summary Cards */}
            {budgetDashboard && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Receita Total</p>
                        <p className="text-2xl font-bold text-green-600">
                          R$ {budgetDashboard.summary.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Despesas Total</p>
                        <p className="text-2xl font-bold text-red-600">
                          R$ {budgetDashboard.summary.totalDespesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Investimentos (CAPEX)</p>
                        <p className="text-2xl font-bold text-blue-600">
                          R$ {budgetDashboard.summary.totalInvestimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Resultado</p>
                        <p className={`text-2xl font-bold ${budgetDashboard.summary.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {budgetDashboard.summary.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Calculator className="h-8 w-8 text-gray-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
                  <TabsTrigger value="por-centro">Por Centro de Custo</TabsTrigger>
                  <TabsTrigger value="linhas">Todas as Linhas</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2">
                  <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Histórico
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Importar do Ano Anterior</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Ano Base</Label>
                          <Select 
                            value={importSettings.baseYear.toString()} 
                            onValueChange={(v) => setImportSettings({ ...importSettings, baseYear: Number(v) })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[2023, 2024, 2025].map((year) => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Ajuste Percentual (%)</Label>
                          <Input
                            type="number"
                            value={importSettings.adjustmentPercent}
                            onChange={(e) => setImportSettings({ ...importSettings, adjustmentPercent: Number(e.target.value) })}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Valores serão ajustados em {importSettings.adjustmentPercent}%
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancelar</Button>
                        <Button onClick={handleImport}>Importar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showNewLineDialog} onOpenChange={setShowNewLineDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Linha
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Adicionar Linha ao Orçamento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Centro de Custo</Label>
                            <Select value={newLine.costCenter} onValueChange={(v) => setNewLine({ ...newLine, costCenter: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {COST_CENTERS.map((cc) => (
                                  <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Categoria</Label>
                            <Select value={newLine.category} onValueChange={(v) => setNewLine({ ...newLine, category: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="" disabled>-- Receitas --</SelectItem>
                                {CATEGORIES.receita.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                                <SelectItem value="" disabled>-- Custos --</SelectItem>
                                {CATEGORIES.custo.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                                <SelectItem value="" disabled>-- Despesas --</SelectItem>
                                {CATEGORIES.despesa.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                                <SelectItem value="" disabled>-- Investimentos (CAPEX) --</SelectItem>
                                {CATEGORIES.investimento.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <Label>Descrição</Label>
                          <Input
                            value={newLine.description}
                            onChange={(e) => setNewLine({ ...newLine, description: e.target.value })}
                            placeholder="Descrição detalhada da linha..."
                          />
                        </div>

                        <div>
                          <Label>Valores Mensais (R$)</Label>
                          <div className="grid grid-cols-6 gap-2 mt-2">
                            {MONTHS.map((month, idx) => {
                              const field = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][idx] as keyof typeof newLine;
                              return (
                                <div key={month}>
                                  <Label className="text-xs">{month}</Label>
                                  <Input
                                    type="number"
                                    value={newLine[field] as string}
                                    onChange={(e) => setNewLine({ ...newLine, [field]: e.target.value })}
                                    className="text-right"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Total Anual: <strong>R$ {calculateLineTotal(newLine).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                          </p>
                        </div>

                        {selectedBudget?.scenario === "base_zero" && (
                          <div>
                            <Label>Justificativa (obrigatória para OBZ)</Label>
                            <Textarea
                              value={newLine.justification}
                              onChange={(e) => setNewLine({ ...newLine, justification: e.target.value })}
                              placeholder="Justifique a necessidade desta despesa..."
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Prioridade</Label>
                            <Select value={newLine.priority} onValueChange={(v: any) => setNewLine({ ...newLine, priority: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="essencial">Essencial</SelectItem>
                                <SelectItem value="importante">Importante</SelectItem>
                                <SelectItem value="desejavel">Desejável</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2 pt-6">
                            <input
                              type="checkbox"
                              id="isCapex"
                              checked={newLine.isCapex}
                              onChange={(e) => setNewLine({ ...newLine, isCapex: e.target.checked })}
                            />
                            <Label htmlFor="isCapex">É investimento (CAPEX)</Label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewLineDialog(false)}>Cancelar</Button>
                        <Button onClick={handleCreateLine} disabled={!newLine.costCenter || !newLine.category}>
                          Adicionar Linha
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {selectedBudget.status === "rascunho" && (
                    <Button variant="default" size="sm" onClick={handleSendForApproval}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar para Aprovação
                    </Button>
                  )}
                </div>
              </div>

              <TabsContent value="visao-geral" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {COST_CENTERS.map((cc) => {
                    const Icon = cc.icon;
                    const lines = budgetLines?.filter((l: any) => l.costCenter === cc.id) || [];
                    const total = lines.reduce((sum: number, l: any) => sum + Number(l.totalYear || 0), 0);
                    
                    return (
                      <Card key={cc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("por-centro")}>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${cc.color}`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{cc.name}</p>
                              <p className="text-sm text-muted-foreground">{lines.length} linhas</p>
                            </div>
                          </div>
                          <p className="text-xl font-bold mt-3">
                            R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="por-centro" className="mt-4">
                <div className="space-y-4">
                  {COST_CENTERS.map((cc) => {
                    const Icon = cc.icon;
                    const lines = budgetLines?.filter((l: any) => l.costCenter === cc.id) || [];
                    if (lines.length === 0) return null;
                    
                    return (
                      <Card key={cc.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${cc.color}`}>
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <CardTitle>{cc.name}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Categoria</th>
                                  {MONTHS.map((m) => (
                                    <th key={m} className="text-right py-2 px-2">{m}</th>
                                  ))}
                                  <th className="text-right py-2 px-2 font-bold">Total</th>
                                  <th className="text-center py-2 px-2">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lines.map((line: any) => (
                                  <tr key={line.id} className="border-b hover:bg-muted/50">
                                    <td className="py-2">{line.description || line.category}</td>
                                    <td className="text-right py-2 px-2">{Number(line.jan).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.fev).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.mar).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.abr).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.mai).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.jun).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.jul).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.ago).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.set).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.out).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.nov).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2">{Number(line.dez).toLocaleString('pt-BR')}</td>
                                    <td className="text-right py-2 px-2 font-bold">{Number(line.totalYear).toLocaleString('pt-BR')}</td>
                                    <td className="text-center py-2 px-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => deleteLineMutation.mutate({ id: line.id })}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="linhas" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Centro de Custo</th>
                            <th className="text-left py-2">Categoria</th>
                            <th className="text-left py-2">Descrição</th>
                            <th className="text-center py-2">Prioridade</th>
                            <th className="text-right py-2">Total Anual</th>
                            <th className="text-center py-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetLines?.map((line: any) => (
                            <tr key={line.id} className="border-b hover:bg-muted/50">
                              <td className="py-2">{COST_CENTERS.find(c => c.id === line.costCenter)?.name}</td>
                              <td className="py-2">{line.category}</td>
                              <td className="py-2">{line.description || "-"}</td>
                              <td className="py-2 text-center">
                                <Badge variant={line.priority === "essencial" ? "destructive" : line.priority === "importante" ? "default" : "secondary"}>
                                  {line.priority}
                                </Badge>
                              </td>
                              <td className="py-2 text-right font-medium">
                                R$ {Number(line.totalYear).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 text-center">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => deleteLineMutation.mutate({ id: line.id })}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Empty State */}
        {(!budgets || budgets.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro orçamento para {selectedYear}
              </p>
              <Button onClick={() => setShowNewBudgetDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Orçamento
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
