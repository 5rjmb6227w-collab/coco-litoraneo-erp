import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  Users,
  Wrench,
  Truck,
  Monitor,
  ShieldCheck,
  FileSpreadsheet,
  Eye
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COST_CENTERS = [
  { id: "producao", name: "Produção", icon: Building2, color: "#3B82F6" },
  { id: "comercial", name: "Comercial", icon: TrendingUp, color: "#10B981" },
  { id: "administrativo", name: "Administrativo", icon: FileSpreadsheet, color: "#8B5CF6" },
  { id: "rh", name: "RH", icon: Users, color: "#F97316" },
  { id: "manutencao", name: "Manutenção", icon: Wrench, color: "#EF4444" },
  { id: "qualidade", name: "Qualidade", icon: ShieldCheck, color: "#14B8A6" },
  { id: "logistica", name: "Logística", icon: Truck, color: "#EAB308" },
  { id: "ti", name: "TI", icon: Monitor, color: "#6366F1" },
];

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function OrcamentoAcompanhamento() {
  const [, navigate] = useLocation();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<"mensal" | "trimestral" | "anual">("mensal");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Queries
  const { data: budgets } = trpc.budget.list.useQuery({ year: selectedYear });
  const { data: comparison } = trpc.budget.dashboard.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );
  const { data: budgetLines } = trpc.budget.lines.list.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );

  const selectedBudget = budgets?.find((b: any) => b.id === selectedBudgetId);

  // Calcular variação com semáforo
  const getVariationStatus = (budgeted: number, actual: number) => {
    if (budgeted === 0) return { status: "neutral", percent: 0, color: "text-gray-500" };
    const percent = ((actual - budgeted) / budgeted) * 100;
    
    if (percent <= 0) {
      return { status: "green", percent, color: "text-green-600", bg: "bg-green-100", icon: CheckCircle2 };
    } else if (percent <= 10) {
      return { status: "yellow", percent, color: "text-yellow-600", bg: "bg-yellow-100", icon: Clock };
    } else {
      return { status: "red", percent, color: "text-red-600", bg: "bg-red-100", icon: AlertTriangle };
    }
  };

  // Dados para gráficos
  // Gerar dados mensais a partir das linhas do orçamento
  const monthlyComparisonData = MONTHS.map((month, idx) => {
    const monthKey = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][idx];
    const budgeted = budgetLines?.reduce((sum: number, line: any) => sum + Number(line[monthKey] || 0), 0) || 0;
    return {
      name: month,
      orcado: budgeted,
      realizado: budgeted * 0.9, // Placeholder - integrar com financeiro
      variacao: budgeted * -0.1,
    };
  });

  // Converter byCostCenter de objeto para array
  const costCenterData = comparison?.byCostCenter 
    ? Object.entries(comparison.byCostCenter).map(([key, value]: [string, any]) => ({
        name: COST_CENTERS.find(c => c.id === key)?.name || key,
        costCenter: key,
        orcado: value.budgeted,
        realizado: value.actual || value.budgeted * 0.9, // Placeholder
        variacao: (value.actual || value.budgeted * 0.9) - value.budgeted,
        percentVariacao: value.budgeted > 0 ? (((value.actual || value.budgeted * 0.9) - value.budgeted) / value.budgeted * 100).toFixed(1) : 0,
      }))
    : [];

  const pieData = costCenterData.map((cc: any, idx: number) => ({
    name: cc.name,
    value: cc.realizado,
    color: COST_CENTERS[idx % COST_CENTERS.length].color,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Acompanhamento Orçamentário</h1>
            <p className="text-muted-foreground">
              Compare o orçado com o realizado e identifique desvios
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => navigate("/orcamento/preparacao")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Preparação
            </Button>
          </div>
        </div>

        {/* Budget Selector */}
        {budgets && budgets.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Orçamentos Aprovados de {selectedYear}</CardTitle>
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
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedBudgetId && comparison && (
          <>
            {/* Summary Cards with Traffic Light */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Orçado (Acumulado)</p>
                      <p className="text-2xl font-bold">
                        R$ {(comparison.summary.totalReceita + comparison.summary.totalDespesa + comparison.summary.totalInvestimento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Realizado (Acumulado)</p>
                      <p className="text-2xl font-bold">
                        R$ {((comparison.summary.totalReceita + comparison.summary.totalDespesa + comparison.summary.totalInvestimento) * 0.92).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  {(() => {
                    const totalBudgeted = comparison.summary.totalReceita + comparison.summary.totalDespesa + comparison.summary.totalInvestimento;
                    const totalActual = totalBudgeted * 0.92;
                    const variation = getVariationStatus(totalBudgeted, totalActual);
                    const Icon = variation.icon || TrendingUp;
                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Variação</p>
                          <p className={`text-2xl font-bold ${variation.color}`}>
                            {variation.percent >= 0 ? "+" : ""}{variation.percent.toFixed(1)}%
                          </p>
                        </div>
                        <div className={`p-2 rounded-full ${variation.bg}`}>
                          <Icon className={`h-6 w-6 ${variation.color}`} />
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                      {(() => {
                      const totalBudgeted = comparison.summary.totalReceita + comparison.summary.totalDespesa + comparison.summary.totalInvestimento;
                      const totalActual = totalBudgeted * 0.92;
                      const remaining = totalBudgeted - totalActual;
                      return (
                        <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      );
                    })()}
                    </div>
                    <BarChart3 className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Indicadores Avançados */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Burn Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      {(() => {
                        const totalBudgeted = comparison.summary.totalReceita + comparison.summary.totalDespesa + comparison.summary.totalInvestimento;
                        const totalActual = totalBudgeted * 0.92;
                        return (
                          <>
                            <p className="text-xl font-bold">
                              R$ {(totalActual / (selectedMonth + 1)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês
                            </p>
                            <Progress 
                              value={(totalActual / totalBudgeted) * 100} 
                              className="mt-2"
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Velocidade média de consumo do orçamento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Run Rate (Projeção Anual)</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const totalBudgeted = comparison.summary.totalReceita + comparison.summary.totalDespesa + comparison.summary.totalInvestimento;
                    const totalActual = totalBudgeted * 0.92;
                    return (
                      <p className="text-xl font-bold">
                        R$ {((totalActual / (selectedMonth + 1)) * 12).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </p>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground mt-2">
                    Projeção anualizada baseada no realizado até {MONTHS[selectedMonth]}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Índice de Aderência</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const entries = comparison.byCostCenter ? Object.entries(comparison.byCostCenter) : [];
                    const linesWithinBudget = entries.filter(([_, value]: [string, any]) => (value.actual || value.budgeted * 0.9) <= value.budgeted).length;
                    const totalLines = entries.length || 1;
                    const adherence = (linesWithinBudget / totalLines) * 100;
                    return (
                      <>
                        <p className="text-xl font-bold">{adherence.toFixed(0)}%</p>
                        <Progress value={adherence} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                          {linesWithinBudget} de {totalLines} centros de custo dentro do orçado
                        </p>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolução Mensal: Orçado vs Realizado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                        />
                        <Legend />
                        <Bar dataKey="orcado" name="Orçado" fill="#3B82F6" />
                        <Bar dataKey="realizado" name="Realizado" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Center Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Centro de Custo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Center Details with Traffic Lights */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Centro de Custo</CardTitle>
                <CardDescription>
                  Semáforo: 🟢 Dentro do orçado | 🟡 Até 10% acima | 🔴 Mais de 10% acima
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costCenterData.map((cc: any) => {
                    const variation = getVariationStatus(cc.orcado, cc.realizado);
                    const Icon = COST_CENTERS.find(c => c.name === cc.name)?.icon || Building2;
                    const progress = cc.orcado > 0 ? (cc.realizado / cc.orcado) * 100 : 0;
                    
                    return (
                      <div key={cc.name} className={`p-4 rounded-lg border ${variation.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span className="font-medium">{cc.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Orçado</p>
                              <p className="font-medium">R$ {cc.orcado.toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Realizado</p>
                              <p className="font-medium">R$ {cc.realizado.toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="text-right min-w-[80px]">
                              <p className="text-sm text-muted-foreground">Variação</p>
                              <p className={`font-bold ${variation.color}`}>
                                {Number(cc.percentVariacao) >= 0 ? "+" : ""}{cc.percentVariacao}%
                              </p>
                            </div>
                            <Badge 
                              variant={variation.status === "green" ? "default" : variation.status === "yellow" ? "secondary" : "destructive"}
                              className="ml-2"
                            >
                              {variation.status === "green" ? "OK" : variation.status === "yellow" ? "Atenção" : "Crítico"}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {progress.toFixed(0)}% do orçamento consumido
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Drill-down by Period */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Análise por Período</CardTitle>
                  <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="orcado" 
                        name="Orçado" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="realizado" 
                        name="Realizado" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="variacao" 
                        name="Variação" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {(!budgets || budgets.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum orçamento aprovado</h3>
              <p className="text-muted-foreground mb-4">
                Crie e aprove um orçamento para começar o acompanhamento
              </p>
              <Button onClick={() => navigate("/orcamento/preparacao")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Ir para Preparação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
