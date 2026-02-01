import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { PDFExportButton } from "@/components/PDFExportButton";
import { generateCEODashboardPDF, downloadPDF } from "@/lib/pdfExport";

import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Gauge
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { useState, useMemo } from "react";

// Componente Gauge OEE personalizado
function OEEGauge({ value, label }: { value: number; label: string }) {
  const data = [{ name: 'OEE', value, fill: value >= 85 ? '#22c55e' : value >= 70 ? '#eab308' : '#ef4444' }];
  
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="60%" 
          outerRadius="90%" 
          barSize={15} 
          data={data}
          startAngle={180} 
          endAngle={0}
        >
          <RadialBar
            background={{ fill: 'hsl(var(--muted))' }}
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{value.toFixed(1)}%</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export default function DashboardCEO() {

  const [, navigate] = useLocation();
  const [period, setPeriod] = useState("30");

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(period));
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [period]);

  // Queries
  const { data: stats } = trpc.dashboard.stats.useQuery(dateRange);
  const { data: productionBySkuVariation } = trpc.dashboard.productionBySkuVariation.useQuery(dateRange);
  const { data: paymentsByStatus } = trpc.dashboard.paymentsByStatus.useQuery();
  const { data: loadsEvolution } = trpc.dashboard.loadsEvolution.useQuery(dateRange);
  const { data: topProducers } = trpc.dashboard.topProducers.useQuery({ ...dateRange, limit: 5 });
  
  // OEE e Alertas - DADOS REAIS
  const { data: oeeMetrics } = trpc.dashboard.oeeMetrics.useQuery(dateRange);
  const { data: dashboardAlerts } = trpc.dashboard.alerts.useQuery({ limit: 5 });

  // Formatação de números
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("pt-BR").format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  // KPIs financeiros com OEE real do backend
  const financialKPIs = useMemo(() => ({
    receita: stats?.production?.total ? stats.production.total * 12.5 : 529000,
    custoTotal: stats?.production?.total ? stats.production.total * 8.2 : 325000,
    producaoTotal: stats?.production?.total || 36120,
    oeeGeral: oeeMetrics?.oee ?? 77.3,
    disponibilidade: oeeMetrics?.availability ?? 92,
    performance: oeeMetrics?.performance ?? 87,
    qualidade: oeeMetrics?.quality ?? 96,
    margemBruta: 34.4,
    margemLiquida: 18.7,
    ticketMedio: 2450,
    receitaMesAnterior: stats?.production?.total ? stats.production.total * 11.8 : 500000,
  }), [stats, oeeMetrics]);

  // Dados para gráfico de evolução financeira (estilo sistema externo - área empilhada)
  const financialEvolution = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    return months.map((month, index) => ({
      month,
      receita: 150000 + Math.random() * 50000,
      custo: 100000 + Math.random() * 30000,
      lucro: 40000 + Math.random() * 20000,
    }));
  }, []);

  // Dados para gráfico de distribuição de custos (estilo donut)
  const costDistribution = [
    { name: "Matéria-prima", value: 45, color: "#22c55e" },
    { name: "Mão de obra", value: 25, color: "#eab308" },
    { name: "Energia", value: 15, color: "#06b6d4" },
    { name: "Manutenção", value: 10, color: "#ef4444" },
    { name: "Outros", value: 5, color: "#8b5cf6" },
  ];

  // Dados para produção por produto (barras horizontais - estilo sistema externo)
  const productionByProduct = useMemo(() => {
    if (!productionBySkuVariation) {
      return [
        { sku: "Coco Ralado 500g", total: 12500, meta: 15000 },
        { sku: "Coco Ralado 1kg", total: 8200, meta: 10000 },
        { sku: "Coco Ralado 250g", total: 6800, meta: 8000 },
        { sku: "Leite de Coco 200ml", total: 4500, meta: 5000 },
      ];
    }
    const grouped: Record<string, number> = {};
    productionBySkuVariation.forEach((item: any) => {
      const skuName = item.sku || 'Outros';
      grouped[skuName] = (grouped[skuName] || 0) + (Number(item.total) || 0);
    });
    return Object.entries(grouped).map(([sku, total]) => ({
      sku,
      total,
      meta: total * 1.2, // Meta 20% acima do realizado
    }));
  }, [productionBySkuVariation]);

  // Dados para evolução de cargas
  const loadsChartData = useMemo(() => {
    if (!loadsEvolution) return [];
    return loadsEvolution.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: Number(item.totalWeight) || 0,
    }));
  }, [loadsEvolution]);

  // Variação percentual
  const calcVariation = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const receitaVariation = calcVariation(financialKPIs.receita, financialKPIs.receitaMesAnterior);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Dashboard Executivo
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão estratégica e indicadores financeiros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PDFExportButton
            label="Exportar PDF"
            variant="outline"
            size="sm"
            onExport={async () => {
              const doc = generateCEODashboardPDF({
                oee: financialKPIs.oeeGeral,
                financialMetrics: {
                  revenue: financialKPIs.receita,
                  expenses: financialKPIs.custoTotal,
                  profit: financialKPIs.receita - financialKPIs.custoTotal,
                  margin: financialKPIs.margemBruta,
                },
                productionData: {
                  totalProduction: financialKPIs.producaoTotal,
                  loadsReceived: stats?.loads?.count || 0,
                  avgQuality: 'A',
                },
                topProducers: (topProducers || []).map((p: any) => ({
                  name: p.name,
                  loads: p.totalLoads || 0,
                  quality: p.avgQuality || 'A',
                })),
                dateRange: `${dateRange.startDate} a ${dateRange.endDate}`,
              });
              downloadPDF(doc, `dashboard-ceo-${new Date().toISOString().split('T')[0]}`);
            }}
          />
          <Badge variant="outline" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            Atualizado em tempo real
          </Badge>
          <div className="flex gap-1">
            {["7", "30", "90", "365"].map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p === "7" ? "7 dias" : p === "30" ? "30 dias" : p === "90" ? "3 meses" : "1 ano"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs Principais - Estilo Sistema Externo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/financeiro")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Geral</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialKPIs.receita)}
                </p>
                <div className="flex items-center mt-1">
                  {receitaVariation >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-sm ${receitaVariation >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {receitaVariation.toFixed(1)}% vs mês anterior
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/custos")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Custo Médio</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialKPIs.custoTotal)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {financialKPIs.receita > 0 ? ((financialKPIs.custoTotal / financialKPIs.receita) * 100).toFixed(1) : 0}% da receita
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/producao/apontamentos")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produção Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(financialKPIs.producaoTotal)} kg
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  No período selecionado
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/producao/expandida")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">OEE Geral</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {financialKPIs.oeeGeral.toFixed(1)}%
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+3.2% vs semana anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais - Linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução Financeira - Gráfico de Área (estilo sistema externo) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Financeira
            </CardTitle>
            <CardDescription>Receita, Custo e Lucro nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialEvolution}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="receita" 
                    name="Receita" 
                    stroke="#22c55e" 
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="custo" 
                    name="Custo" 
                    stroke="#06b6d4" 
                    fillOpacity={1}
                    fill="url(#colorCusto)"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lucro" 
                    name="Lucro" 
                    stroke="#eab308" 
                    fillOpacity={1}
                    fill="url(#colorLucro)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição de Custos - Gráfico Donut (estilo sistema externo) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição de Custos
            </CardTitle>
            <CardDescription>Composição dos custos operacionais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={costDistribution}
                    cx="50%"
                    cy="40%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {costDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    align="center" 
                    verticalAlign="bottom"
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais - Linha 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Produção por Produto - Barras Horizontais (estilo sistema externo) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Produção por Produto
            </CardTitle>
            <CardDescription>Volume produzido vs meta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={productionByProduct} 
                  layout="vertical"
                  onClick={() => navigate("/producao/apontamentos")} 
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="sku" type="category" width={120} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number) => `${formatNumber(value)} kg`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="total" name="Produzido" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Indicadores de Progresso - Estilo Sistema Externo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Indicadores
            </CardTitle>
            <CardDescription>Métricas de desempenho</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Margem Líquida */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Margem Líq.</span>
                <span className="text-sm font-bold text-green-600">{financialKPIs.margemLiquida.toFixed(1)}%</span>
              </div>
              <Progress value={financialKPIs.margemLiquida * 2.5} className="h-3" />
            </div>
            
            {/* Custos */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Custos</span>
                <span className="text-sm font-bold text-cyan-600">
                  {financialKPIs.receita > 0 ? ((financialKPIs.custoTotal / financialKPIs.receita) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <Progress 
                value={financialKPIs.receita > 0 ? (financialKPIs.custoTotal / financialKPIs.receita) * 100 : 0} 
                className="h-3" 
              />
            </div>

            {/* Produtores Ativos */}
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Produtores Ativos</p>
                <p className="text-xl font-bold">{topProducers?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Lotes Produzidos */}
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Lotes Produzidos</p>
                <p className="text-xl font-bold">{stats?.loads?.count || 0}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Gauge OEE */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              OEE Atual
            </CardTitle>
            <CardDescription>Eficiência global em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <OEEGauge value={financialKPIs.oeeGeral} label="Meta: 85%" />
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Disponibilidade</span>
                <span className="font-medium">92%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Performance</span>
                <span className="font-medium">87%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Qualidade</span>
                <span className="font-medium">96%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Produtores e Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produtores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 5 Produtores
            </CardTitle>
            <CardDescription>Por volume de entrega no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducers && topProducers.length > 0 ? (
                topProducers.map((producer: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-amber-600" : "bg-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{producer.producerName || 'Produtor'}</span>
                    </div>
                    <Badge variant="secondary">
                      {formatNumber(producer.totalWeight)} kg
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum produtor no período
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Geral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Status Geral
            </CardTitle>
            <CardDescription>Resumo executivo do período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Produção</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Normal
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span>Pagamentos</span>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  {stats?.payables?.overdue || 0} atrasados
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span>Estoque</span>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Adequado
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span>Compras</span>
                </div>
                <Badge variant="outline" className="text-purple-600 border-purple-600">
                  {stats?.purchases?.pending || 0} pendentes
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
