import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  ArrowRight,
  Activity,
  Gauge,
  Flame,
  Timer,
  PieChart,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from "recharts";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Mock data for forecast
const generateForecastData = () => {
  const currentMonth = new Date().getMonth();
  return MONTHS.map((month, idx) => {
    const orcado = 100000 + Math.random() * 50000;
    const realizado = idx <= currentMonth ? orcado * (0.85 + Math.random() * 0.3) : null;
    const forecast = idx > currentMonth ? orcado * (0.9 + Math.random() * 0.2) : null;
    
    return {
      month,
      orcado: Math.round(orcado),
      realizado: realizado ? Math.round(realizado) : null,
      forecast: forecast ? Math.round(forecast) : null,
      acumuladoOrcado: 0,
      acumuladoRealizado: 0,
    };
  });
};

export default function OrcamentoForecast() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("forecast");
  
  // Queries
  const { data: budgets } = trpc.budget.list.useQuery({ year: selectedYear });
  const { data: forecasts, refetch: refetchForecasts } = trpc.budget.forecasts.list.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );
  const { data: indicators } = trpc.budget.indicators.list.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );

  // Mock forecast data
  const forecastData = useMemo(() => generateForecastData(), []);

  // Calculate cumulative values
  const cumulativeData = useMemo(() => {
    let accOrcado = 0;
    let accRealizado = 0;
    let accForecast = 0;
    
    return forecastData.map(item => {
      accOrcado += item.orcado;
      if (item.realizado) accRealizado += item.realizado;
      if (item.forecast) accForecast += item.forecast;
      
      return {
        ...item,
        acumuladoOrcado: accOrcado,
        acumuladoRealizado: item.realizado ? accRealizado : null,
        acumuladoForecast: item.forecast ? accRealizado + accForecast : null,
      };
    });
  }, [forecastData]);

  // Calculate indicators
  const calculatedIndicators = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const totalOrcado = forecastData.reduce((sum, m) => sum + m.orcado, 0);
    const totalRealizado = forecastData.reduce((sum, m) => sum + (m.realizado || 0), 0);
    const orcadoAteMes = forecastData.slice(0, currentMonth + 1).reduce((sum, m) => sum + m.orcado, 0);
    
    // Burn Rate: % do orçamento consumido até agora
    const burnRate = (totalRealizado / orcadoAteMes) * 100;
    
    // Run Rate: projeção anualizada baseada no realizado
    const avgMensal = totalRealizado / (currentMonth + 1);
    const runRate = avgMensal * 12;
    
    // Variância Acumulada
    const varianciaAcumulada = totalRealizado - orcadoAteMes;
    const varianciaPercent = ((totalRealizado - orcadoAteMes) / orcadoAteMes) * 100;
    
    // Índice de Aderência: % de meses dentro do orçado (±10%)
    const mesesDentro = forecastData.filter((m, idx) => {
      if (idx > currentMonth || !m.realizado) return false;
      const variacao = Math.abs((m.realizado - m.orcado) / m.orcado);
      return variacao <= 0.1;
    }).length;
    const aderencia = (mesesDentro / (currentMonth + 1)) * 100;
    
    // Forecast de fechamento
    const forecastFechamento = totalRealizado + forecastData.slice(currentMonth + 1).reduce((sum, m) => sum + (m.forecast || m.orcado), 0);
    
    return {
      burnRate,
      runRate,
      varianciaAcumulada,
      varianciaPercent,
      aderencia,
      forecastFechamento,
      totalOrcado,
      totalRealizado,
      mesesRestantes: 12 - currentMonth - 1,
    };
  }, [forecastData]);

  const getVarianceColor = (value: number) => {
    if (value <= -10) return "text-green-600";
    if (value <= 0) return "text-green-500";
    if (value <= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getAderenciaColor = (value: number) => {
    if (value >= 80) return "text-green-600";
    if (value >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Forecast Rolling & Indicadores</h1>
            <p className="text-muted-foreground">
              Previsão contínua e indicadores avançados de orçamento
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

            <Select 
              value={selectedBudgetId?.toString() || ""} 
              onValueChange={(v) => setSelectedBudgetId(Number(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o orçamento" />
              </SelectTrigger>
              <SelectContent>
                {budgets?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => refetchForecasts()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Forecast
            </Button>
          </div>
        </div>

        {/* KPI Cards - Indicadores Avançados */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-muted-foreground">Burn Rate</span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${getVarianceColor(calculatedIndicators.burnRate - 100)}`}>
                {calculatedIndicators.burnRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">do orçado até agora</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Run Rate</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                R$ {(calculatedIndicators.runRate / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-muted-foreground">projeção anualizada</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                {calculatedIndicators.varianciaPercent >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-red-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">Variância</span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${getVarianceColor(calculatedIndicators.varianciaPercent)}`}>
                {calculatedIndicators.varianciaPercent >= 0 ? "+" : ""}{calculatedIndicators.varianciaPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                R$ {Math.abs(calculatedIndicators.varianciaAcumulada).toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">Aderência</span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${getAderenciaColor(calculatedIndicators.aderencia)}`}>
                {calculatedIndicators.aderencia.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">meses dentro do orçado</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-teal-500" />
                <span className="text-sm text-muted-foreground">Forecast Ano</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                R$ {(calculatedIndicators.forecastFechamento / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-muted-foreground">
                vs R$ {(calculatedIndicators.totalOrcado / 1000).toFixed(0)}k orçado
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">Meses Restantes</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {calculatedIndicators.mesesRestantes}
              </p>
              <p className="text-xs text-muted-foreground">para fechar o ano</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="forecast">Forecast Rolling</TabsTrigger>
            <TabsTrigger value="acumulado">Visão Acumulada</TabsTrigger>
            <TabsTrigger value="projecao">Projeção 12 Meses</TabsTrigger>
          </TabsList>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Orçado vs Realizado vs Forecast</CardTitle>
                <CardDescription>
                  Comparação mensal com previsão atualizada para os meses restantes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => v ? `R$ ${v.toLocaleString('pt-BR')}` : '-'} />
                      <Legend />
                      <Bar dataKey="orcado" name="Orçado" fill="#94A3B8" />
                      <Line 
                        type="monotone" 
                        dataKey="realizado" 
                        name="Realizado" 
                        stroke="#10B981" 
                        strokeWidth={3}
                        dot={{ fill: '#10B981', strokeWidth: 2 }}
                        connectNulls={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="forecast" 
                        name="Forecast" 
                        stroke="#F97316" 
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ fill: '#F97316', strokeWidth: 2 }}
                        connectNulls={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Mês</th>
                        <th className="text-right p-2">Orçado</th>
                        <th className="text-right p-2">Realizado</th>
                        <th className="text-right p-2">Forecast</th>
                        <th className="text-right p-2">Variação</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map((item, idx) => {
                        const atual = item.realizado || item.forecast || 0;
                        const variacao = ((atual - item.orcado) / item.orcado) * 100;
                        const currentMonth = new Date().getMonth();
                        
                        return (
                          <tr key={item.month} className="border-b">
                            <td className="p-2 font-medium">{item.month}</td>
                            <td className="text-right p-2">R$ {item.orcado.toLocaleString('pt-BR')}</td>
                            <td className="text-right p-2">
                              {item.realizado ? `R$ ${item.realizado.toLocaleString('pt-BR')}` : '-'}
                            </td>
                            <td className="text-right p-2 text-orange-600">
                              {item.forecast ? `R$ ${item.forecast.toLocaleString('pt-BR')}` : '-'}
                            </td>
                            <td className={`text-right p-2 ${getVarianceColor(variacao)}`}>
                              {variacao >= 0 ? "+" : ""}{variacao.toFixed(1)}%
                            </td>
                            <td className="text-center p-2">
                              {idx < currentMonth ? (
                                <Badge className={Math.abs(variacao) <= 10 ? "bg-green-500" : "bg-red-500"}>
                                  {Math.abs(variacao) <= 10 ? "OK" : "Desvio"}
                                </Badge>
                              ) : idx === currentMonth ? (
                                <Badge className="bg-blue-500">Atual</Badge>
                              ) : (
                                <Badge variant="outline">Previsto</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acumulado Tab */}
          <TabsContent value="acumulado" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Visão Acumulada</CardTitle>
                <CardDescription>
                  Evolução acumulada do orçamento ao longo do ano
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => v ? `R$ ${v.toLocaleString('pt-BR')}` : '-'} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="acumuladoOrcado" 
                        name="Orçado Acumulado" 
                        fill="#94A3B8" 
                        fillOpacity={0.3}
                        stroke="#64748B"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="acumuladoRealizado" 
                        name="Realizado Acumulado" 
                        fill="#10B981" 
                        fillOpacity={0.5}
                        stroke="#059669"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="acumuladoForecast" 
                        name="Forecast Acumulado" 
                        fill="#F97316" 
                        fillOpacity={0.3}
                        stroke="#EA580C"
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projeção Tab */}
          <TabsContent value="projecao" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Projeção de Fechamento</CardTitle>
                  <CardDescription>Cenários para o fechamento do ano</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Cenário Otimista</span>
                      <Badge className="bg-green-500">-5% do forecast</Badge>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {(calculatedIndicators.forecastFechamento * 0.95 / 1000).toFixed(0)}k
                    </p>
                    <Progress value={95} className="mt-2" />
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Cenário Base</span>
                      <Badge className="bg-blue-500">Forecast atual</Badge>
                    </div>
                    <p className="text-2xl font-bold">
                      R$ {(calculatedIndicators.forecastFechamento / 1000).toFixed(0)}k
                    </p>
                    <Progress value={100} className="mt-2" />
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Cenário Pessimista</span>
                      <Badge className="bg-red-500">+10% do forecast</Badge>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      R$ {(calculatedIndicators.forecastFechamento * 1.1 / 1000).toFixed(0)}k
                    </p>
                    <Progress value={110} className="mt-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recomendações da IA</CardTitle>
                  <CardDescription>Insights baseados nos indicadores</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {calculatedIndicators.burnRate > 105 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Burn Rate Elevado</p>
                          <p className="text-sm text-red-700">
                            O consumo do orçamento está {(calculatedIndicators.burnRate - 100).toFixed(1)}% acima do esperado. 
                            Revise os gastos dos próximos meses.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {calculatedIndicators.aderencia < 70 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">Baixa Aderência</p>
                          <p className="text-sm text-yellow-700">
                            Apenas {calculatedIndicators.aderencia.toFixed(0)}% dos meses ficaram dentro do orçado. 
                            Considere revisar as premissas orçamentárias.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-800">Projeção de Fechamento</p>
                        <p className="text-sm text-blue-700">
                          Com base no Run Rate atual, o ano deve fechar em R$ {(calculatedIndicators.runRate / 1000).toFixed(0)}k, 
                          {calculatedIndicators.runRate > calculatedIndicators.totalOrcado ? " acima " : " abaixo "}
                          do orçado em {Math.abs(((calculatedIndicators.runRate - calculatedIndicators.totalOrcado) / calculatedIndicators.totalOrcado) * 100).toFixed(1)}%.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-800">Próximos Passos</p>
                        <p className="text-sm text-green-700">
                          Atualize o forecast mensalmente para manter a previsão precisa. 
                          Faltam {calculatedIndicators.mesesRestantes} meses para o fechamento do ano.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
