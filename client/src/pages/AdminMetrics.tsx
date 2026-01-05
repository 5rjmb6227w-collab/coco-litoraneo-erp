/**
 * AdminMetrics - Dashboard de Métricas e KPIs
 * Bloco 9/9 - Observabilidade avançada para administradores
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  MessageSquare, 
  RefreshCw, 
  Server, 
  TrendingUp, 
  Users, 
  Zap,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Globe,
  Database,
  Cpu
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ============================================================================
// TIPOS
// ============================================================================

interface KPIMetrics {
  timestamp: number;
  period: "day" | "week" | "month";
  metrics: {
    avgLatencyChat: number;
    avgLatencyInsights: number;
    avgLatencyActions: number;
    p95LatencyChat: number;
    totalRequests: number;
    requestsByModule: Record<string, number>;
    activeUsers: number;
    errorRate: number;
    errorsBySource: Record<string, number>;
    unresolvedErrors: number;
    chatMessages: number;
    insightsGenerated: number;
    alertsTriggered: number;
    actionsApproved: number;
    feedbackScore: number;
    integrationSuccessRate: number;
    whatsappMessages: number;
    zapierTriggers: number;
  };
}

interface IntegrationStatus {
  whatsapp: "active" | "inactive" | "error";
  zapier: "active" | "inactive" | "error";
  calendar: "active" | "inactive" | "error";
  email: "active" | "inactive" | "error";
}

// ============================================================================
// DADOS MOCK (em produção, viriam do backend)
// ============================================================================

const mockKPIData: KPIMetrics = {
  timestamp: Date.now(),
  period: "day",
  metrics: {
    avgLatencyChat: 342,
    avgLatencyInsights: 156,
    avgLatencyActions: 89,
    p95LatencyChat: 890,
    totalRequests: 15420,
    requestsByModule: {
      dashboard: 4521,
      recebimento: 2340,
      producao: 3210,
      almoxarifado: 1890,
      financeiro: 1560,
      copiloto: 1899,
    },
    activeUsers: 23,
    errorRate: 0.0023,
    errorsBySource: {
      frontend: 12,
      backend: 8,
      llm: 3,
      integration: 2,
    },
    unresolvedErrors: 5,
    chatMessages: 847,
    insightsGenerated: 156,
    alertsTriggered: 23,
    actionsApproved: 18,
    feedbackScore: 4.2,
    integrationSuccessRate: 98.5,
    whatsappMessages: 89,
    zapierTriggers: 34,
  },
};

const mockLatencyHistory = [
  { time: "00:00", chat: 320, insights: 140, actions: 85 },
  { time: "04:00", chat: 290, insights: 130, actions: 78 },
  { time: "08:00", chat: 380, insights: 165, actions: 92 },
  { time: "12:00", chat: 420, insights: 180, actions: 105 },
  { time: "16:00", chat: 350, insights: 155, actions: 88 },
  { time: "20:00", chat: 310, insights: 145, actions: 82 },
];

const mockErrorHistory = [
  { date: "01/01", frontend: 15, backend: 8, llm: 2, integration: 1 },
  { date: "02/01", frontend: 12, backend: 10, llm: 4, integration: 2 },
  { date: "03/01", frontend: 18, backend: 6, llm: 1, integration: 0 },
  { date: "04/01", frontend: 10, backend: 5, llm: 3, integration: 1 },
  { date: "05/01", frontend: 8, backend: 4, llm: 2, integration: 1 },
];

const mockIntegrationStatus: IntegrationStatus = {
  whatsapp: "active",
  zapier: "active",
  calendar: "inactive",
  email: "active",
};

// ============================================================================
// COMPONENTES
// ============================================================================

function KPICard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
}: {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  color?: "primary" | "success" | "warning" | "danger";
}) {
  const colorClasses = {
    primary: "text-primary",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    stable: "text-gray-500",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>
              {value}
              {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
            </p>
            {trend && trendValue && (
              <p className={`text-xs ${trendColors[trend]}`}>
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
              </p>
            )}
          </div>
          <Icon className={`h-8 w-8 ${colorClasses[color]} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrationStatusCard({
  name,
  status,
  icon: Icon,
  lastSync,
}: {
  name: string;
  status: "active" | "inactive" | "error";
  icon: React.ElementType;
  lastSync?: string;
}) {
  const statusConfig = {
    active: { color: "bg-green-500", text: "Ativo", icon: CheckCircle },
    inactive: { color: "bg-gray-400", text: "Inativo", icon: WifiOff },
    error: { color: "bg-red-500", text: "Erro", icon: XCircle },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{name}</p>
          {lastSync && (
            <p className="text-xs text-muted-foreground">Último sync: {lastSync}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 ${status === "active" ? "text-green-500" : status === "error" ? "text-red-500" : "text-gray-400"}`} />
        <Badge variant={status === "active" ? "default" : status === "error" ? "destructive" : "secondary"}>
          {config.text}
        </Badge>
      </div>
    </div>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

export default function AdminMetrics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [kpiData, setKpiData] = useState<KPIMetrics>(mockKPIData);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Em produção, buscar dados do backend
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const COLORS = ["#8B7355", "#D4C4B0", "#5D4E37", "#A89078", "#6B5B4F"];

  const moduleData = Object.entries(kpiData.metrics.requestsByModule).map(([name, value]) => ({
    name,
    value,
  }));

  const errorSourceData = Object.entries(kpiData.metrics.errorsBySource).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Métricas e Observabilidade</h1>
            <p className="text-muted-foreground">
              Monitoramento em tempo real do sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Últimas 24h</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <KPICard
            title="Latência Chat"
            value={kpiData.metrics.avgLatencyChat}
            unit="ms"
            icon={Clock}
            trend="down"
            trendValue="-12% vs ontem"
            color={kpiData.metrics.avgLatencyChat < 500 ? "success" : "warning"}
          />
          <KPICard
            title="Requisições"
            value={kpiData.metrics.totalRequests.toLocaleString()}
            icon={Activity}
            trend="up"
            trendValue="+8% vs ontem"
          />
          <KPICard
            title="Usuários Ativos"
            value={kpiData.metrics.activeUsers}
            icon={Users}
            trend="stable"
            trendValue="mesmo que ontem"
          />
          <KPICard
            title="Taxa de Erro"
            value={(kpiData.metrics.errorRate * 100).toFixed(2)}
            unit="%"
            icon={AlertTriangle}
            color={kpiData.metrics.errorRate < 0.01 ? "success" : "danger"}
          />
          <KPICard
            title="Feedback Score"
            value={kpiData.metrics.feedbackScore.toFixed(1)}
            unit="/ 5"
            icon={TrendingUp}
            color={kpiData.metrics.feedbackScore >= 4 ? "success" : "warning"}
          />
          <KPICard
            title="Integrações"
            value={kpiData.metrics.integrationSuccessRate.toFixed(1)}
            unit="%"
            icon={Zap}
            color={kpiData.metrics.integrationSuccessRate >= 95 ? "success" : "warning"}
          />
        </div>

        {/* Tabs de Métricas */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="usage">Uso por Módulo</TabsTrigger>
            <TabsTrigger value="errors">Erros</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="copilot">Copiloto IA</TabsTrigger>
          </TabsList>

          {/* Performance */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Latência por Endpoint</CardTitle>
                  <CardDescription>Tempo de resposta médio (ms)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mockLatencyHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="chat" stroke="#8B7355" name="Chat" strokeWidth={2} />
                      <Line type="monotone" dataKey="insights" stroke="#D4C4B0" name="Insights" strokeWidth={2} />
                      <Line type="monotone" dataKey="actions" stroke="#5D4E37" name="Ações" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Percentis de Latência</CardTitle>
                  <CardDescription>P50, P95, P99 do Chat</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>P50 (Mediana)</span>
                      <span className="font-medium">{kpiData.metrics.avgLatencyChat}ms</span>
                    </div>
                    <Progress value={kpiData.metrics.avgLatencyChat / 10} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>P95</span>
                      <span className="font-medium">{kpiData.metrics.p95LatencyChat}ms</span>
                    </div>
                    <Progress value={kpiData.metrics.p95LatencyChat / 10} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>P99</span>
                      <span className="font-medium">{Math.round(kpiData.metrics.p95LatencyChat * 1.3)}ms</span>
                    </div>
                    <Progress value={(kpiData.metrics.p95LatencyChat * 1.3) / 10} className="h-2" />
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Status do Sistema</p>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium text-green-600">Todos os serviços operacionais</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Uso por Módulo */}
          <TabsContent value="usage" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Requisições por Módulo</CardTitle>
                  <CardDescription>Distribuição de uso do sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={moduleData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {moduleData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Módulos</CardTitle>
                  <CardDescription>Por número de requisições</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={moduleData.sort((a, b) => b.value - a.value)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8B7355" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Erros */}
          <TabsContent value="errors" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Erros por Fonte</CardTitle>
                  <CardDescription>Últimos 5 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={mockErrorHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="frontend" stackId="1" stroke="#8B7355" fill="#8B7355" name="Frontend" />
                      <Area type="monotone" dataKey="backend" stackId="1" stroke="#D4C4B0" fill="#D4C4B0" name="Backend" />
                      <Area type="monotone" dataKey="llm" stackId="1" stroke="#5D4E37" fill="#5D4E37" name="LLM" />
                      <Area type="monotone" dataKey="integration" stackId="1" stroke="#A89078" fill="#A89078" name="Integração" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Erros Não Resolvidos</CardTitle>
                  <CardDescription>{kpiData.metrics.unresolvedErrors} erros pendentes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {errorSourceData.map((source, index) => (
                    <div key={source.name} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="capitalize">{source.name}</span>
                      </div>
                      <Badge variant={source.value > 10 ? "destructive" : "secondary"}>
                        {source.value} erros
                      </Badge>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full mt-4">
                    Ver todos os erros
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Integrações */}
          <TabsContent value="integrations" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status das Integrações</CardTitle>
                  <CardDescription>Conexões externas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <IntegrationStatusCard
                    name="WhatsApp (Twilio)"
                    status={mockIntegrationStatus.whatsapp}
                    icon={MessageSquare}
                    lastSync="há 2 min"
                  />
                  <IntegrationStatusCard
                    name="Zapier"
                    status={mockIntegrationStatus.zapier}
                    icon={Zap}
                    lastSync="há 5 min"
                  />
                  <IntegrationStatusCard
                    name="Google Calendar"
                    status={mockIntegrationStatus.calendar}
                    icon={Globe}
                  />
                  <IntegrationStatusCard
                    name="E-mail (Fallback)"
                    status={mockIntegrationStatus.email}
                    icon={Wifi}
                    lastSync="há 1 min"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Métricas de Integração</CardTitle>
                  <CardDescription>Últimas 24 horas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Mensagens WhatsApp</span>
                    <span className="font-bold text-lg">{kpiData.metrics.whatsappMessages}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Triggers Zapier</span>
                    <span className="font-bold text-lg">{kpiData.metrics.zapierTriggers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Taxa de Sucesso</span>
                    <span className="font-bold text-lg text-green-600">
                      {kpiData.metrics.integrationSuccessRate}%
                    </span>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Uptime</p>
                    <div className="flex items-center gap-2">
                      <Progress value={99.9} className="flex-1" />
                      <span className="text-sm font-medium">99.9%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Copiloto IA */}
          <TabsContent value="copilot" className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <KPICard
                title="Mensagens Chat"
                value={kpiData.metrics.chatMessages}
                icon={MessageSquare}
                trend="up"
                trendValue="+15% vs ontem"
              />
              <KPICard
                title="Insights Gerados"
                value={kpiData.metrics.insightsGenerated}
                icon={TrendingUp}
                trend="up"
                trendValue="+8% vs ontem"
              />
              <KPICard
                title="Alertas Disparados"
                value={kpiData.metrics.alertsTriggered}
                icon={AlertTriangle}
                trend="down"
                trendValue="-5% vs ontem"
                color="warning"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ações do Copiloto</CardTitle>
                  <CardDescription>Aprovações e rejeições</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Ações Aprovadas</span>
                      <Badge variant="default">{kpiData.metrics.actionsApproved}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Taxa de Aprovação</span>
                      <span className="font-bold text-green-600">78%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tempo Médio de Resposta</span>
                      <span className="font-medium">{kpiData.metrics.avgLatencyChat}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Feedback dos Usuários</CardTitle>
                  <CardDescription>Avaliação do Copiloto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-5xl font-bold text-primary">
                      {kpiData.metrics.feedbackScore.toFixed(1)}
                    </p>
                    <p className="text-muted-foreground">de 5.0</p>
                    <div className="flex justify-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-2xl ${
                            star <= Math.round(kpiData.metrics.feedbackScore)
                              ? "text-yellow-500"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer com informações do sistema */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap justify-between items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span>Servidor: OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Database: OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>CPU: 23%</span>
                </div>
              </div>
              <div>
                Última atualização: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
