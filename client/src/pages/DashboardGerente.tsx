import DashboardLayout from "@/components/DashboardLayout";
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
  Calendar
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useState, useMemo } from "react";

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

  // Formatação de números
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("pt-BR").format(num);
  };

  // Dados de OEE simulados (em produção viriam do backend)
  const oeeData = useMemo(() => ({
    disponibilidade: 92,
    performance: 87,
    qualidade: 95,
    oee: 76, // OEE = D x P x Q
  }), []);

  // Dados para gráfico de produção por turno
  const shiftChartData = useMemo(() => {
    if (!productionByShift) return [];
    return productionByShift.map((item: any) => ({
      turno: item.shift === "manha" ? "Manhã" : item.shift === "tarde" ? "Tarde" : "Noite",
      quantidade: Number(item.total) || 0,
    }));
  }, [productionByShift]);

  // Cores para gráfico de turnos
  const shiftColors = ["#8B7355", "#D4C4B0", "#5D4E37"];

  // Dados de qualidade
  const qualityData = useMemo(() => {
    if (!ncsByMonth) return [];
    return ncsByMonth.map((item: any) => ({
      mes: item.month,
      ncs: Number(item.count) || 0,
    }));
  }, [ncsByMonth]);

  // Status das máquinas (simulado)
  const machineStatus = [
    { name: "Linha 1 - Descascador", status: "running", efficiency: 94 },
    { name: "Linha 2 - Ralador", status: "running", efficiency: 88 },
    { name: "Linha 3 - Prensa", status: "maintenance", efficiency: 0 },
    { name: "Linha 4 - Secador", status: "running", efficiency: 91 },
    { name: "Linha 5 - Embalagem", status: "running", efficiency: 96 },
  ];

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
            Dashboard Gerente
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão operacional e controle de produção
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            Turno: Manhã
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

      {/* OEE e KPIs Operacionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* OEE Principal */}
        <Card className="lg:col-span-2 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/producao/expandida")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              OEE - Eficiência Global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Disponibilidade:</span>
                  <Progress value={oeeData.disponibilidade} className="w-24 h-2" />
                  <span className="text-sm font-medium">{oeeData.disponibilidade}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Performance:</span>
                  <Progress value={oeeData.performance} className="w-24 h-2" />
                  <span className="text-sm font-medium">{oeeData.performance}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Qualidade:</span>
                  <Progress value={oeeData.qualidade} className="w-24 h-2" />
                  <span className="text-sm font-medium">{oeeData.qualidade}%</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{oeeData.oee}%</div>
                <div className="text-sm text-muted-foreground">OEE Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/producao/apontamentos")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produção Hoje</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(stats?.production?.total ? Math.round(stats.production.total / 7) : 0)} kg
                </p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
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

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/rh/colaboradores")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Equipe Ativa</p>
                <p className="text-2xl font-bold text-blue-600">
                  24
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
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

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produção por Turno */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Produção por Turno
            </CardTitle>
            <CardDescription>Distribuição da produção entre os turnos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {shiftChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={shiftChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ turno, percent }: any) => `${turno}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="quantidade"
                    >
                      {shiftChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={shiftColors[index % shiftColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${formatNumber(value)} kg`} />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhum dado de produção no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* NCs por Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Não Conformidades por Mês
            </CardTitle>
            <CardDescription>Evolução das NCs ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {qualityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={qualityData} onClick={() => navigate("/qualidade/ncs")} style={{ cursor: 'pointer' }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="ncs" name="NCs" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhuma NC no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarefas e Alertas */}
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
              <p className="text-2xl font-bold">18°C</p>
              <p className="text-sm text-muted-foreground">Câmara Fria</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">OK</p>
              <p className="text-sm text-muted-foreground">Todos os Parâmetros</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
