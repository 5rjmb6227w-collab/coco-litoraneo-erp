import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Factory, 
  Truck, 
  DollarSign, 
  AlertTriangle, 
  ShoppingCart, 
  FileWarning,
  Plus,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Calendar,
  Clock
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  InsightsDoDiaWidget,
  AlertasCriticosWidget,
  PendenciasWidget,
  CopilotoQuickAccessWidget
} from "@/components/copilot/CopilotWidgets";

const COLORS = ['#8B7355', '#D4C4B0', '#5D4E37', '#A89078', '#C4B4A0', '#6D5E47'];
const STATUS_COLORS: Record<string, string> = {
  pendente: '#EAB308',
  aprovado: '#3B82F6',
  programado: '#22C55E',
  pago: '#10B981',
  atrasado: '#EF4444',
};

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState("30");

  // Run seeds on first load
  const seedMutation = trpc.seed.runAll.useMutation();
  
  useEffect(() => {
    seedMutation.mutate();
  }, []);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(period));
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [period]);

  // Queries básicas (Tarefa 1)
  const { data: producers } = trpc.producers.list.useQuery({ status: "ativo" });
  const { data: loads } = trpc.coconutLoads.list.useQuery({});
  const { data: payables } = trpc.producerPayables.list.useQuery({});
  const { data: warehouseItems } = trpc.warehouseItems.list.useQuery({ warehouseType: "producao", belowMinimum: true });
  const { data: skus } = trpc.skus.list.useQuery({ belowMinimum: true });

  // Queries do Dashboard (Tarefa 4)
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(dateRange);
  const { data: productionBySku } = trpc.dashboard.productionBySkuVariation.useQuery(dateRange);
  const { data: productionByShift } = trpc.dashboard.productionByShift.useQuery(dateRange);
  const { data: topProducers } = trpc.dashboard.topProducers.useQuery({ ...dateRange, limit: 5 });
  const { data: loadsEvolution } = trpc.dashboard.loadsEvolution.useQuery(dateRange);
  const { data: paymentsByStatus } = trpc.dashboard.paymentsByStatus.useQuery();
  const { data: upcomingPayments } = trpc.dashboard.upcomingPayments.useQuery({ days: 7 });
  const { data: stockAlerts } = trpc.dashboard.stockAlerts.useQuery();
  const { data: expiringProducts } = trpc.dashboard.expiringProducts.useQuery({ days: 30 });
  const { data: ncsByMonth } = trpc.dashboard.ncsByMonth.useQuery({ months: 6 });
  const { data: conformityIndex } = trpc.dashboard.conformityIndex.useQuery(dateRange);

  // Cálculos básicos
  const pendingPayables = payables?.filter(p => p.status === "pendente" || p.status === "aprovado") || [];
  const totalPending = pendingPayables.reduce((acc, p) => acc + Number(p.totalValue), 0);
  const openLoads = loads?.filter(l => l.status !== "fechado") || [];

  // Format data for charts
  const productionChartData = useMemo(() => {
    if (!productionBySku) return [];
    const grouped: Record<string, Record<string, number>> = {};
    productionBySku.forEach((item: any) => {
      const skuId = item.sku || 'Outros';
      if (!grouped[skuId]) grouped[skuId] = {};
      grouped[skuId][item.variation || 'outros'] = Number(item.total) || 0;
    });
    return Object.entries(grouped).map(([sku, variations]) => ({
      sku,
      flocos: variations.flocos || 0,
      medio: variations.medio || 0,
      fino: variations.fino || 0,
    }));
  }, [productionBySku]);

  const shiftChartData = useMemo(() => {
    if (!productionByShift) return [];
    return productionByShift.map((item: any) => ({
      name: item.shift === 'manha' ? 'Manhã' : item.shift === 'tarde' ? 'Tarde' : 'Noite',
      value: Number(item.total) || 0,
    }));
  }, [productionByShift]);

  const paymentStatusData = useMemo(() => {
    if (!paymentsByStatus) return [];
    return paymentsByStatus.map((item: any) => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      value: Number(item.total) || 0,
      count: Number(item.count) || 0,
    }));
  }, [paymentsByStatus]);

  const loadsChartData = useMemo(() => {
    if (!loadsEvolution) return [];
    return loadsEvolution.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      peso: Number(item.totalWeight) || 0,
      cargas: Number(item.count) || 0,
    }));
  }, [loadsEvolution]);

  const ncsChartData = useMemo(() => {
    if (!ncsByMonth) return [];
    return ncsByMonth.map((item: any) => ({
      month: item.month,
      count: Number(item.count) || 0,
    }));
  }, [ncsByMonth]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Banner de Coqueiros */}
        <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden shadow-lg">
          <img 
            src="/coqueiros-banner.webp" 
            alt="Plantação de coqueiros - Coco Litorâneo" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center">
            <div className="px-6 md:px-10">
              <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">Coco Litorâneo</h1>
              <p className="text-white/90 text-lg md:text-xl mt-2 drop-shadow">Sistema de Gestão Integrada</p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do sistema Coco Litorâneo</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 3 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate("/recebimento")} className="bg-primary">
            <Plus className="h-4 w-4 mr-1" /> Nova Carga
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/producao/apontamentos")}>
            <ClipboardList className="h-4 w-4 mr-1" /> Apontamento
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/compras")}>
            <ShoppingCart className="h-4 w-4 mr-1" /> Solicitação
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/producao/apontamentos")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produção Total</CardTitle>
              <Factory className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? <Skeleton className="h-8 w-20" /> : `${formatNumber(stats?.production?.total || 0)} kg`}
              </div>
              <p className="text-xs text-muted-foreground">No período selecionado</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/recebimento")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cargas Recebidas</CardTitle>
              <Truck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? <Skeleton className="h-8 w-16" /> : stats?.loads?.count || openLoads.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">{formatNumber(stats?.loads?.totalWeight || 0)} kg total</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/financeiro")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Pagar Produtores</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statsLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(stats?.payables?.pending || totalPending || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Pagamentos pendentes</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/financeiro")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(stats?.payables?.overdue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Requer atenção</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/compras")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compras Pendentes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.purchases?.pending || 0}
              </div>
              <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/qualidade/nao-conformidades")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">NCs Abertas</CardTitle>
              <FileWarning className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.ncs?.open || 0}
              </div>
              <p className="text-xs text-muted-foreground">Não conformidades</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos - Linha 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produção por SKU/Variação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Produção por SKU/Variação</CardTitle>
              <CardDescription>Quantidade produzida por tipo de produto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {productionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productionChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sku" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${formatNumber(value)} kg`} />
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

          {/* Produção por Turno */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Produção por Turno</CardTitle>
              <CardDescription>Distribuição da produção por turno</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {shiftChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={shiftChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {shiftChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${formatNumber(value)} kg`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhum dado de produção no período
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos - Linha 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução do Recebimento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução do Recebimento</CardTitle>
              <CardDescription>Peso recebido por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {loadsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={loadsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${formatNumber(value)} kg`} />
                      <Legend />
                      <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#8B7355" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhum recebimento no período
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagamentos por Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pagamentos por Status</CardTitle>
              <CardDescription>Distribuição dos pagamentos a produtores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {paymentStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhum pagamento registrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabelas e Listas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Produtores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 5 Produtores
              </CardTitle>
              <CardDescription>Por volume no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProducers && topProducers.length > 0 ? (
                  topProducers.map((producer: any, index: number) => (
                    <div key={producer.producerId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                        <span className="text-sm truncate max-w-[150px]">{producer.producerName}</span>
                      </div>
                      <span className="text-sm font-medium">{formatNumber(Number(producer.totalWeight))} kg</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum produtor no período</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vencimentos Próximos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Vencimentos (7 dias)
              </CardTitle>
              <CardDescription>Pagamentos próximos do vencimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingPayments && upcomingPayments.length > 0 ? (
                  upcomingPayments.map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium truncate max-w-[120px]">{payment.producerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(Number(payment.totalAmount))}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum vencimento próximo</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alertas de Estoque */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Alertas de Estoque
              </CardTitle>
              <CardDescription>Itens abaixo do mínimo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {(stockAlerts?.warehouse && stockAlerts.warehouse.length > 0) || (warehouseItems && warehouseItems.length > 0) ? (
                  (stockAlerts?.warehouse || warehouseItems || []).slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[150px]">{item.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        {Number(item.currentStock).toFixed(0)} / {Number(item.minimumStock).toFixed(0)} {item.unit}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum alerta de estoque</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Qualidade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NCs por Mês */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Não Conformidades por Mês</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {ncsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ncsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="NCs" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nenhuma NC registrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Índice de Conformidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Índice de Conformidade</CardTitle>
              <CardDescription>Análises conformes no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex flex-col items-center justify-center">
                <div className={`text-6xl font-bold ${
                  (conformityIndex?.percentage || 100) >= 95 ? 'text-green-600' :
                  (conformityIndex?.percentage || 100) >= 80 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {conformityIndex?.percentage?.toFixed(1) || 100}%
                </div>
                <p className="text-muted-foreground mt-2">
                  {conformityIndex?.conforming || 0} de {conformityIndex?.total || 0} análises conformes
                </p>
                <div className="flex items-center gap-2 mt-4">
                  {(conformityIndex?.percentage || 100) >= 95 ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="text-green-600">Excelente</span>
                    </>
                  ) : (conformityIndex?.percentage || 100) >= 80 ? (
                    <>
                      <TrendingDown className="h-5 w-5 text-yellow-600" />
                      <span className="text-yellow-600">Atenção</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-red-600">Crítico</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Produtos Próximos do Vencimento */}
        {expiringProducts && expiringProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Produtos Próximos do Vencimento
              </CardTitle>
              <CardDescription>Produtos com validade em até 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">SKU</th>
                      <th className="text-left py-2">Lote</th>
                      <th className="text-left py-2">Validade</th>
                      <th className="text-right py-2">Quantidade</th>
                      <th className="text-center py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringProducts.slice(0, 5).map((product: any) => {
                      const daysUntilExpiry = Math.ceil(
                        (new Date(product.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <tr key={product.id} className="border-b">
                          <td className="py-2">{product.skuCode}</td>
                          <td className="py-2">{product.batchNumber}</td>
                          <td className="py-2">{new Date(product.expirationDate).toLocaleDateString('pt-BR')}</td>
                          <td className="py-2 text-right">{formatNumber(Number(product.quantity))} kg</td>
                          <td className="py-2 text-center">
                            <Badge variant={daysUntilExpiry <= 7 ? "destructive" : "secondary"}>
                              {daysUntilExpiry <= 0 ? 'Vencido' : `${daysUntilExpiry} dias`}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widgets do Copiloto IA */}
        <CopilotoQuickAccessWidget />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <InsightsDoDiaWidget />
          <AlertasCriticosWidget />
          <PendenciasWidget />
        </div>

        {/* Mensagem de boas-vindas */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <span className="text-4xl">🥥</span>
              <h2 className="text-lg font-semibold">Bem-vindo ao Sistema Coco Litorâneo</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Use o menu lateral para navegar entre os módulos do sistema. 
                Todos os gráficos e indicadores são atualizados automaticamente com base nos dados cadastrados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
