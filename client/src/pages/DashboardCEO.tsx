import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

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
  Calendar
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
} from "recharts";
import { useState, useMemo } from "react";

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

  // Dados simulados para KPIs financeiros (em produção viriam do backend)
  const financialKPIs = useMemo(() => ({
    receita: stats?.production?.total ? stats.production.total * 12.5 : 0,
    custoTotal: stats?.production?.total ? stats.production.total * 8.2 : 0,
    margemBruta: 34.4,
    margemLiquida: 18.7,
    ticketMedio: 2450,
    receitaMesAnterior: stats?.production?.total ? stats.production.total * 11.8 : 0,
  }), [stats]);

  // Dados para gráfico de evolução financeira
  const financialEvolution = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    return months.map((month) => ({
      month,
      receita: 150000 + Math.random() * 50000,
      custo: 100000 + Math.random() * 30000,
      margem: 30 + Math.random() * 10,
    }));
  }, []);

  // Dados para gráfico de distribuição de custos
  const costDistribution = [
    { name: "Matéria-prima", value: 45, color: "#8B7355" },
    { name: "Mão de obra", value: 25, color: "#D4C4B0" },
    { name: "Energia", value: 15, color: "#5D4E37" },
    { name: "Manutenção", value: 10, color: "#A69076" },
    { name: "Outros", value: 5, color: "#C4B5A0" },
  ];

  // Dados para produção por período
  const productionChartData = useMemo(() => {
    if (!productionBySkuVariation) return [];
    const grouped: Record<string, { sku: string; flocos: number; medio: number; fino: number }> = {};
    productionBySkuVariation.forEach((item: any) => {
      const skuName = item.sku || 'Outros';
      if (!grouped[skuName]) {
        grouped[skuName] = { sku: skuName, flocos: 0, medio: 0, fino: 0 };
      }
      if (item.variation === "flocos") grouped[skuName].flocos = Number(item.total) || 0;
      if (item.variation === "medio") grouped[skuName].medio = Number(item.total) || 0;
      if (item.variation === "fino") grouped[skuName].fino = Number(item.total) || 0;
    });
    return Object.values(grouped);
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
            Dashboard CEO
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão estratégica e indicadores financeiros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            Atualizado agora
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

      {/* KPIs Financeiros Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/financeiro")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receita Bruta</p>
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
                <p className="text-sm font-medium text-muted-foreground">Custo Total</p>
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

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/custos")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Margem Bruta</p>
                <p className="text-2xl font-bold text-blue-600">
                  {financialKPIs.margemBruta.toFixed(1)}%
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+2.3% vs meta</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/custos")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Margem Líquida</p>
                <p className="text-2xl font-bold text-purple-600">
                  {financialKPIs.margemLiquida.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Meta: 20%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/producao/apontamentos")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produção Total</p>
                <p className="text-2xl font-bold text-primary">
                  {formatNumber(stats?.production?.total || 0)} kg
                </p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/recebimento")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cargas Recebidas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.loads?.count || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/pagamentos")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">A Pagar Produtores</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats?.payables?.pending || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/qualidade/ncs")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">NCs Abertas</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats?.ncs?.open || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Financeira */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Financeira
            </CardTitle>
            <CardDescription>Receita vs Custos nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
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
                    fill="#22c55e" 
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="custo" 
                    name="Custo" 
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição de Custos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição de Custos
            </CardTitle>
            <CardDescription>Composição dos custos operacionais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={costDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Produção por SKU */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Produção por SKU
            </CardTitle>
            <CardDescription>Volume de produção por produto e variação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {productionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionChartData} onClick={() => navigate("/producao/apontamentos")} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sku" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `${formatNumber(value)} kg`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="flocos" name="Flocos" fill="#8B7355" />
                    <Bar dataKey="medio" name="Médio" fill="#D4C4B0" />
                    <Bar dataKey="fino" name="Fino" fill="#5D4E37" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhum dado de produção no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Evolução de Recebimento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Evolução do Recebimento
            </CardTitle>
            <CardDescription>Volume de cargas recebidas ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={loadsChartData} onClick={() => navigate("/recebimento")} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `${formatNumber(value)} kg`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#8B7355" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhum dado de recebimento no período
                </div>
              )}
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
