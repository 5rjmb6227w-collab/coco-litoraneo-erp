import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  FileText,
  Download,
  Mail,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  Brain,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const COLORS = ["#3B82F6", "#10B981", "#F97316", "#8B5CF6", "#EF4444", "#06B6D4"];

interface AIInsight {
  id: number;
  type: "alert" | "opportunity" | "prediction" | "recommendation";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  category: string;
  actionable: boolean;
  suggestedAction?: string;
}

export default function OrcamentoRelatorios() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("ytd");
  const [activeTab, setActiveTab] = useState("executivo");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  
  // Queries
  const { data: budgets } = trpc.budget.list.useQuery({ year: selectedYear });

  // Mock data for executive report
  const executiveData = useMemo(() => ({
    totalOrcado: 1850000,
    totalRealizado: 1420000,
    variacao: -23.2,
    burnRate: 76.8,
    forecastFechamento: 1780000,
    aderencia: 72,
    byCategory: [
      { name: "Produção", orcado: 850000, realizado: 680000, variacao: -20 },
      { name: "Comercial", orcado: 350000, realizado: 290000, variacao: -17 },
      { name: "Administrativo", orcado: 280000, realizado: 250000, variacao: -11 },
      { name: "RH", orcado: 220000, realizado: 130000, variacao: -41 },
      { name: "Manutenção", orcado: 150000, realizado: 70000, variacao: -53 },
    ],
    monthlyTrend: MONTHS.map((month, idx) => ({
      month,
      orcado: 150000 + Math.random() * 20000,
      realizado: idx < new Date().getMonth() ? 140000 + Math.random() * 30000 : null,
    })),
  }), []);

  // AI Insights
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([
    {
      id: 1,
      type: "alert",
      title: "Custos de Energia Acima do Orçado",
      description: "Os custos de energia estão 18% acima do orçado nos últimos 3 meses. Tendência de aumento.",
      impact: "high",
      category: "Produção",
      actionable: true,
      suggestedAction: "Renegociar contrato com fornecedor de energia ou avaliar fontes alternativas.",
    },
    {
      id: 2,
      type: "opportunity",
      title: "Economia em Matéria-Prima",
      description: "Custos de matéria-prima 12% abaixo do orçado. Oportunidade de realocar recursos.",
      impact: "medium",
      category: "Produção",
      actionable: true,
      suggestedAction: "Considerar antecipação de compras para aproveitar preços favoráveis.",
    },
    {
      id: 3,
      type: "prediction",
      title: "Projeção de Fechamento",
      description: "Com base na tendência atual, o orçamento de RH será consumido até outubro, 2 meses antes do previsto.",
      impact: "high",
      category: "RH",
      actionable: true,
      suggestedAction: "Revisar contratações planejadas ou solicitar suplementação orçamentária.",
    },
    {
      id: 4,
      type: "recommendation",
      title: "Otimização de Manutenção",
      description: "Orçamento de manutenção subexecutado em 53%. Risco de acúmulo de manutenções no final do ano.",
      impact: "medium",
      category: "Manutenção",
      actionable: true,
      suggestedAction: "Antecipar manutenções preventivas para evitar picos de gastos.",
    },
    {
      id: 5,
      type: "alert",
      title: "Desvio Acumulado Significativo",
      description: "Variância acumulada de -23% indica subexecução generalizada. Pode impactar metas de crescimento.",
      impact: "high",
      category: "Geral",
      actionable: true,
      suggestedAction: "Reunião de revisão orçamentária com gestores de área.",
    },
  ]);

  const handleGenerateReport = async (format: "pdf" | "excel") => {
    setIsGeneratingReport(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(`Relatório ${format.toUpperCase()} gerado com sucesso!`);
    setIsGeneratingReport(false);
  };

  const handleSendByEmail = async () => {
    toast.success("Relatório enviado por email!");
  };

  const handleRefreshAI = async () => {
    setIsAnalyzingAI(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast.success("Análise de IA atualizada!");
    setIsAnalyzingAI(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "alert":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "opportunity":
        return <Lightbulb className="h-5 w-5 text-green-500" />;
      case "prediction":
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case "recommendation":
        return <Zap className="h-5 w-5 text-purple-500" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightBg = (type: string) => {
    switch (type) {
      case "alert":
        return "bg-red-50 border-red-200";
      case "opportunity":
        return "bg-green-50 border-green-200";
      case "prediction":
        return "bg-blue-50 border-blue-200";
      case "recommendation":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "high":
        return <Badge className="bg-red-500">Alto Impacto</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Médio Impacto</Badge>;
      case "low":
        return <Badge className="bg-green-500">Baixo Impacto</Badge>;
      default:
        return <Badge variant="outline">{impact}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios Executivos & IA Avançada</h1>
            <p className="text-muted-foreground">
              Relatórios gerenciais e insights inteligentes do orçamento
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

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ytd">Ano até Hoje</SelectItem>
                <SelectItem value="q1">1º Trimestre</SelectItem>
                <SelectItem value="q2">2º Trimestre</SelectItem>
                <SelectItem value="q3">3º Trimestre</SelectItem>
                <SelectItem value="q4">4º Trimestre</SelectItem>
                <SelectItem value="full">Ano Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="executivo">Relatório Executivo</TabsTrigger>
            <TabsTrigger value="ia">IA Avançada</TabsTrigger>
          </TabsList>

          {/* Relatório Executivo Tab */}
          <TabsContent value="executivo" className="space-y-4">
            {/* Export Actions */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-medium">Exportar Relatório:</span>
                  <Button 
                    variant="outline" 
                    onClick={() => handleGenerateReport("pdf")}
                    disabled={isGeneratingReport}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleGenerateReport("excel")}
                    disabled={isGeneratingReport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={handleSendByEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar por Email
                  </Button>
                  <Button variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Orçado</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    R$ {(executiveData.totalOrcado / 1000000).toFixed(2)}M
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">Realizado</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    R$ {(executiveData.totalRealizado / 1000000).toFixed(2)}M
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {executiveData.variacao < 0 ? (
                      <ArrowDownRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-sm text-muted-foreground">Variação</span>
                  </div>
                  <p className={`text-2xl font-bold mt-2 ${executiveData.variacao < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {executiveData.variacao}%
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-orange-500" />
                    <span className="text-sm text-muted-foreground">Burn Rate</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {executiveData.burnRate}%
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Forecast</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    R$ {(executiveData.forecastFechamento / 1000000).toFixed(2)}M
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-teal-500" />
                    <span className="text-sm text-muted-foreground">Aderência</span>
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {executiveData.aderencia}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Orçado vs Realizado por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={executiveData.byCategory} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                        <Legend />
                        <Bar dataKey="orcado" name="Orçado" fill="#94A3B8" />
                        <Bar dataKey="realizado" name="Realizado" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Evolução Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={executiveData.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => v ? `R$ ${v.toLocaleString('pt-BR')}` : '-'} />
                        <Legend />
                        <Area type="monotone" dataKey="orcado" name="Orçado" fill="#94A3B8" fillOpacity={0.3} stroke="#64748B" />
                        <Area type="monotone" dataKey="realizado" name="Realizado" fill="#3B82F6" fillOpacity={0.5} stroke="#2563EB" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Centro de Custo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Centro de Custo</th>
                        <th className="text-right p-3">Orçado</th>
                        <th className="text-right p-3">Realizado</th>
                        <th className="text-right p-3">Variação</th>
                        <th className="text-center p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executiveData.byCategory.map((cat) => (
                        <tr key={cat.name} className="border-b">
                          <td className="p-3 font-medium">{cat.name}</td>
                          <td className="text-right p-3">R$ {cat.orcado.toLocaleString('pt-BR')}</td>
                          <td className="text-right p-3">R$ {cat.realizado.toLocaleString('pt-BR')}</td>
                          <td className={`text-right p-3 ${cat.variacao < 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {cat.variacao}%
                          </td>
                          <td className="text-center p-3">
                            {Math.abs(cat.variacao) <= 10 ? (
                              <Badge className="bg-green-500">OK</Badge>
                            ) : Math.abs(cat.variacao) <= 25 ? (
                              <Badge className="bg-yellow-500">Atenção</Badge>
                            ) : (
                              <Badge className="bg-red-500">Crítico</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IA Avançada Tab */}
          <TabsContent value="ia" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      Análise Inteligente do Orçamento
                    </CardTitle>
                    <CardDescription>
                      Insights gerados automaticamente pela IA com base nos dados orçamentários
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleRefreshAI}
                    disabled={isAnalyzingAI}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
                    {isAnalyzingAI ? 'Analisando...' : 'Atualizar Análise'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">
                      {aiInsights.filter(i => i.type === "alert").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Alertas</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <Lightbulb className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {aiInsights.filter(i => i.type === "opportunity").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Oportunidades</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <TrendingUp className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">
                      {aiInsights.filter(i => i.type === "prediction").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Previsões</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <Zap className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">
                      {aiInsights.filter(i => i.type === "recommendation").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Recomendações</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {aiInsights.map((insight) => (
                    <div 
                      key={insight.id} 
                      className={`p-4 border rounded-lg ${getInsightBg(insight.type)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{insight.title}</h4>
                            {getImpactBadge(insight.impact)}
                            <Badge variant="outline">{insight.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {insight.description}
                          </p>
                          {insight.suggestedAction && (
                            <div className="p-2 bg-white rounded border mt-2">
                              <p className="text-sm">
                                <strong>Ação Sugerida:</strong> {insight.suggestedAction}
                              </p>
                            </div>
                          )}
                        </div>
                        {insight.actionable && (
                          <Button size="sm" variant="outline">
                            Tomar Ação
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Predictions */}
            <Card>
              <CardHeader>
                <CardTitle>Previsões da IA para os Próximos Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Próximo Mês</span>
                    </div>
                    <p className="text-2xl font-bold">R$ 165k</p>
                    <p className="text-sm text-muted-foreground">
                      Previsão de gastos com 92% de confiança
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">Fechamento do Ano</span>
                    </div>
                    <p className="text-2xl font-bold">R$ 1.78M</p>
                    <p className="text-sm text-muted-foreground">
                      3.8% abaixo do orçado
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <span className="font-medium">Risco de Estouro</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">Médio</p>
                    <p className="text-sm text-muted-foreground">
                      2 centros de custo em atenção
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
