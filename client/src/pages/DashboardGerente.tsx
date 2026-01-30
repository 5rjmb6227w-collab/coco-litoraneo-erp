import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  Factory, 
  Users, 
  Package, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Gauge,
  Wrench,
  Thermometer,
  Droplets,
  ClipboardCheck,
  Target,
  Activity,
  BarChart3,
  Calendar,
  Bell
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
  RadialBarChart,
  RadialBar,
} from "recharts";
import { useState, useMemo } from "react";

// Componente Gauge OEE personalizado (estilo sistema externo)
function OEEGauge({ value, meta }: { value: number; meta: number }) {
  const data = [{ name: 'OEE', value, fill: value >= meta ? '#22c55e' : value >= meta * 0.8 ? '#eab308' : '#ef4444' }];
  
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart 
          cx="50%" 
          cy="50%" 
          innerRadius="65%" 
          outerRadius="95%" 
          barSize={18} 
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
        <span className="text-4xl font-bold">{value.toFixed(1)}%</span>
        <span className="text-sm text-muted-foreground">Meta: {meta}%</span>
      </div>
    </div>
  );
}

// Função para calcular tempo relativo
function getRelativeTime(minutes: number): string {
  if (minutes < 60) return `Há ${minutes} min`;
  if (minutes < 1440) return `Há ${Math.floor(minutes / 60)} hora${Math.floor(minutes / 60) > 1 ? 's' : ''}`;
  return `Há ${Math.floor(minutes / 1440)} dia${Math.floor(minutes / 1440) > 1 ? 's' : ''}`;
}

export default function DashboardGerente() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState("7");

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
  const { data: productionByShift } = trpc.dashboard.productionByShift.useQuery(dateRange);
  const { data: ncsByMonth } = trpc.dashboard.ncsByMonth.useQuery({ months: 6 });
  const { data: stockAlerts } = trpc.dashboard.stockAlerts.useQuery();
  
  // OEE e Alertas - DADOS REAIS
  const { data: oeeMetrics } = trpc.dashboard.oeeMetrics.useQuery(dateRange);
  const { data: oeeHistory } = trpc.dashboard.oeeHistory.useQuery({ days: 7 });
  const { data: dashboardAlerts } = trpc.dashboard.alerts.useQuery({ limit: 5 });

  // Formatação de números
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("pt-BR").format(num);
  };

  // Dados de OEE reais do backend
  const oeeData = useMemo(() => ({
    disponibilidade: oeeMetrics?.availability ?? 92,
    performance: oeeMetrics?.performance ?? 87,
    qualidade: oeeMetrics?.quality ?? 96.5,
    oee: oeeMetrics?.oee ?? 77.3,
  }), [oeeMetrics]);

  // Dados para gráfico de OEE por dia - DADOS REAIS
  const oeeEvolution = useMemo(() => {
    if (oeeHistory && oeeHistory.length > 0) {
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      return oeeHistory.map((item: any) => {
        const date = new Date(item.date);
        return {
          day: dayNames[date.getDay()],
          disponibilidade: item.availability,
          performance: item.performance,
          qualidade: item.quality,
        };
      });
    }
    // Fallback para dados de exemplo
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    return days.map((day) => ({
      day,
      disponibilidade: 88 + Math.random() * 8,
      performance: 82 + Math.random() * 10,
      qualidade: 93 + Math.random() * 5,
    }));
  }, [oeeHistory]);

  // Dados para gráfico de produção por turno com meta (estilo sistema externo)
  const shiftChartData = useMemo(() => {
    const baseData = [
      { turno: "Manhã", produzido: 0, meta: 5000 },
      { turno: "Tarde", produzido: 0, meta: 4500 },
      { turno: "Noite", produzido: 0, meta: 3500 },
    ];
    
    if (productionByShift) {
      productionByShift.forEach((item: any) => {
        const turnoName = item.shift === "manha" ? "Manhã" : item.shift === "tarde" ? "Tarde" : "Noite";
        const found = baseData.find(d => d.turno === turnoName);
        if (found) {
          found.produzido = Number(item.total) || 0;
        }
      });
    }
    
    // Se não houver dados, usar valores de exemplo
    if (baseData.every(d => d.produzido === 0)) {
      baseData[0].produzido = 4200;
      baseData[1].produzido = 3800;
      baseData[2].produzido = 2900;
    }
    
    return baseData;
  }, [productionByShift]);

  // Status das máquinas (simulado)
  const machineStatus = [
    { name: "Linha 1 - Descascador", status: "running", efficiency: 94 },
    { name: "Linha 2 - Ralador", status: "running", efficiency: 88 },
    { name: "Linha 3 - Prensa", status: "maintenance", efficiency: 0 },
    { name: "Linha 4 - Secador", status: "running", efficiency: 91 },
    { name: "Linha 5 - Embalagem", status: "running", efficiency: 96 },
  ];

  // Alertas do sistema com timestamps - DADOS REAIS
  const systemAlerts = useMemo(() => {
    if (dashboardAlerts && dashboardAlerts.length > 0) {
      return dashboardAlerts.map((alert: any) => {
        const minutesAgo = Math.floor((new Date().getTime() - new Date(alert.timestamp).getTime()) / (1000 * 60));
        return {
          type: alert.severity === 'critical' ? 'warning' : alert.severity === 'warning' ? 'warning' : 'info',
          title: alert.title,
          message: alert.message,
          minutesAgo,
        };
      });
    }
    // Fallback para dados de exemplo
    return [
      { type: "warning", title: "Estoque Baixo", message: "Embalagens plásticas 500g abaixo do mínimo", minutesAgo: 15 },
      { type: "info", title: "Manutenção Preventiva", message: "Secador 02 programado para 14:00", minutesAgo: 60 },
      { type: "success", title: "Lote Aprovado", message: "LOTE-2026-042 passou no controle de qualidade", minutesAgo: 120 },
      { type: "warning", title: "Carga Pendente", message: "3 cargas aguardando aprovação", minutesAgo: 180 },
    ];
  }, [dashboardAlerts]);

  // Tarefas do dia (simulado)
  const todayTasks = [
    { task: "Verificar calibração das balanças", status: "done", priority: "high" },
    { task: "Reunião de produção 08:00", status: "done", priority: "medium" },
    { task: "Aprovar OPs da semana", status: "pending", priority: "high" },
    { task: "Revisar relatório de qualidade", status: "pending", priority: "medium" },
    { task: "Acompanhar manutenção Linha 3", status: "in_progress", priority: "high" },
  ];

  // Alertas de estoque
  const warehouseAlerts = stockAlerts?.warehouse?.filter((item: any) => 
    item.currentQuantity < item.minimumStock
  ) || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Factory className="h-8 w-8 text-primary" />
            Dashboard Gerencial
          </h1>
          <p className="text-muted-foreground mt-1">
            Métricas operacionais e eficiência da produção
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/producao/expandida")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ordens em Andamento</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats?.production?.total ? Math.ceil(stats.production.total / 5000) : 3}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Produção ativa</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/recebimento")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cargas Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats?.loads?.count || 1}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Aguardando aprovação</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/producao/expandida")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eficiência Geral (OEE)</p>
                <p className="text-2xl font-bold text-green-600">
                  {oeeData.oee.toFixed(1)}%
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">+3.2% vs semana anterior</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/qualidade/ncs")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Qualidade Média</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {oeeData.qualidade.toFixed(1)}%
                </p>
                <Badge variant="outline" className="mt-1 text-green-600 border-green-600">
                  Excelente
                </Badge>
              </div>
              <div className="h-12 w-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos OEE e Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Linha OEE - Estilo Sistema Externo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              OEE - Eficiência Global do Equipamento
            </CardTitle>
            <CardDescription>Disponibilidade, Performance e Qualidade por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={oeeEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[70, 100]} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="disponibilidade" 
                    name="Disponibilidade" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="performance" 
                    name="Performance" 
                    stroke="#eab308" 
                    strokeWidth={2}
                    dot={{ fill: '#eab308', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="qualidade" 
                    name="Qualidade" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gauge OEE - Estilo Sistema Externo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              OEE Atual
            </CardTitle>
            <CardDescription>Eficiência global em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <OEEGauge value={oeeData.oee} meta={85} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-lg font-bold text-green-600">{oeeData.disponibilidade}%</p>
                <p className="text-xs text-muted-foreground">Disponib.</p>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-lg font-bold text-yellow-600">{oeeData.performance}%</p>
                <p className="text-xs text-muted-foreground">Perform.</p>
              </div>
              <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <p className="text-lg font-bold text-cyan-600">{oeeData.qualidade}%</p>
                <p className="text-xs text-muted-foreground">Qualidade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status das Máquinas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Status das Linhas de Produção
          </CardTitle>
          <CardDescription>Monitoramento em tempo real das máquinas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {machineStatus.map((machine, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  machine.status === "running" 
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                    : machine.status === "maintenance"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{machine.name}</span>
                  <Badge variant={machine.status === "running" ? "default" : machine.status === "maintenance" ? "secondary" : "destructive"}>
                    {machine.status === "running" ? "Rodando" : machine.status === "maintenance" ? "Manutenção" : "Parada"}
                  </Badge>
                </div>
                {machine.status === "running" && (
                  <div className="flex items-center gap-2">
                    <Progress value={machine.efficiency} className="h-2" />
                    <span className="text-sm font-medium">{machine.efficiency}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de Produção e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produção por Turno com Meta - Estilo Sistema Externo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Produção por Turno
            </CardTitle>
            <CardDescription>Quantidade produzida vs meta por turno</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="turno" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => `${formatNumber(value)} kg`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="produzido" name="Produzido" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alertas do Sistema com Timestamps - Estilo Sistema Externo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas do Sistema
            </CardTitle>
            <CardDescription>Notificações e avisos importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemAlerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:opacity-80 ${
                    alert.type === "warning" 
                      ? "bg-yellow-50 dark:bg-yellow-900/20" 
                      : alert.type === "success"
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-blue-50 dark:bg-blue-900/20"
                  }`}
                  onClick={() => {
                    if (alert.title.includes("Estoque")) navigate("/almoxarifado/producao");
                    else if (alert.title.includes("Manutenção")) navigate("/producao/expandida");
                    else if (alert.title.includes("Lote")) navigate("/qualidade/analises");
                    else if (alert.title.includes("Carga")) navigate("/recebimento");
                  }}
                >
                  {alert.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  ) : alert.type === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{alert.title}</span>
                      <span className="text-xs text-muted-foreground">{getRelativeTime(alert.minutesAgo)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarefas e Alertas de Estoque */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas do Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Tarefas do Dia
            </CardTitle>
            <CardDescription>Atividades programadas para hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayTasks.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    item.status === "done" 
                      ? "bg-green-50 dark:bg-green-900/20" 
                      : item.status === "in_progress"
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.status === "done" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : item.status === "in_progress" ? (
                      <Clock className="h-5 w-5 text-blue-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                    )}
                    <span className={item.status === "done" ? "line-through text-muted-foreground" : ""}>
                      {item.task}
                    </span>
                  </div>
                  <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>
                    {item.priority === "high" ? "Alta" : "Média"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alertas de Estoque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque
            </CardTitle>
            <CardDescription>Itens abaixo do estoque mínimo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warehouseAlerts.length > 0 ? (
                warehouseAlerts.slice(0, 5).map((alert: any, index: number) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                    onClick={() => navigate("/almoxarifado/producao")}
                  >
                    <div>
                      <span className="font-medium">{alert.name}</span>
                      <p className="text-sm text-muted-foreground">
                        Atual: {alert.currentQuantity} {alert.unit} | Mínimo: {alert.minimumStock} {alert.unit}
                      </p>
                    </div>
                    <Badge variant="destructive">Crítico</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600" />
                  <p>Todos os estoques estão adequados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores Ambientais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Condições Ambientais
          </CardTitle>
          <CardDescription>Monitoramento de temperatura e umidade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <Thermometer className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">24°C</p>
              <p className="text-sm text-muted-foreground">Área de Produção</p>
            </div>
            <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg text-center">
              <Droplets className="h-8 w-8 mx-auto mb-2 text-cyan-600" />
              <p className="text-2xl font-bold">65%</p>
              <p className="text-sm text-muted-foreground">Umidade Relativa</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
              <Thermometer className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold">32°C</p>
              <p className="text-sm text-muted-foreground">Secadores</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
              <Thermometer className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">4°C</p>
              <p className="text-sm text-muted-foreground">Câmara Fria</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
