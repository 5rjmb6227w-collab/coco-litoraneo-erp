/**
 * CopilotWidgets - Widgets do Copiloto IA para o Dashboard
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Clock,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  Loader2,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// Configuração de severidade
const severityConfig = {
  info: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

/**
 * Widget de Insights do Dia
 */
export function InsightsDoDiaWidget() {
  const insightsQuery = trpc.ai.listInsights.useQuery({ 
    status: "active", 
    limit: 5 
  });
  const runChecksQuery = trpc.ai.runInsightChecks.useMutation();

  const insights = insightsQuery.data || [];
  const criticalCount = insights.filter(i => i.severity === "critical").length;
  const warningCount = insights.filter(i => i.severity === "warning").length;

  const handleRefresh = () => {
    runChecksQuery.mutate(undefined, {
      onSuccess: () => {
        insightsQuery.refetch();
      }
    });
  };

  if (insightsQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insights do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Insights do Dia
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={runChecksQuery.isPending}
              className="h-7 px-2"
            >
              {runChecksQuery.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
            {criticalCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs">
                {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 text-xs">
                {warningCount} atenção
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-6 text-stone-500">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-stone-300" />
            <p className="text-sm">Nenhum insight ativo no momento</p>
            <p className="text-xs text-stone-400 mt-1">
              O sistema está monitorando automaticamente
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {insights.slice(0, 5).map((insight: any) => {
              const config = severityConfig[insight.severity as keyof typeof severityConfig];
              const Icon = config.icon;
              
              return (
                <div
                  key={insight.id}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-lg border",
                    config.bg,
                    config.border
                  )}
                >
                  <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {insight.title}
                    </p>
                    <p className="text-xs text-stone-600 line-clamp-1">
                      {insight.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Link href="/copiloto">
          <Button variant="ghost" className="w-full mt-3 text-sm h-8">
            Ver todos os insights
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Widget de Alertas Críticos
 */
export function AlertasCriticosWidget() {
  const eventsQuery = trpc.ai.listEvents.useQuery({ limit: 10 });
  
  // Simular alertas críticos a partir dos eventos
  const criticalAlerts = (eventsQuery.data || [])
    .slice(0, 3)
    .map((event: any, index: number) => ({
      id: event.id,
      title: String(event.eventType || 'unknown').replace(/_/g, " ").replace(/\./g, " - "),
      module: event.module || "Sistema",
      createdAt: event.createdAt,
      severity: index === 0 ? "critical" : "warning"
    }));

  if (eventsQuery.isLoading) {
    return (
      <Card className="border-red-200 bg-red-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            Alertas Críticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-colors",
      criticalAlerts.length > 0 ? "border-red-200 bg-red-50/30" : ""
    )}>
      <CardHeader className="pb-2">
        <CardTitle className={cn(
          "text-base flex items-center gap-2",
          criticalAlerts.length > 0 ? "text-red-700" : "text-stone-700"
        )}>
          <AlertCircle className="h-4 w-4" />
          Alertas Críticos
          {criticalAlerts.length > 0 && (
            <Badge className="bg-red-600 text-white text-xs ml-auto">
              {criticalAlerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {criticalAlerts.length === 0 ? (
          <div className="text-center py-4 text-stone-500">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-sm text-green-700">Nenhum alerta crítico</p>
          </div>
        ) : (
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-3 p-2 bg-white rounded border border-red-100"
              >
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate capitalize">
                    {alert.title}
                  </p>
                  <p className="text-xs text-stone-500">
                    {alert.module}
                  </p>
                </div>
                <Clock className="h-3 w-3 text-stone-400" />
              </div>
            ))}
          </div>
        )}

        <Link href="/copiloto?tab=alertas">
          <Button variant="ghost" className="w-full mt-3 text-sm h-8">
            Ver todos os alertas
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Widget de Pendências
 */
export function PendenciasWidget() {
  const statsQuery = trpc.ai.getStats.useQuery();
  const stats = statsQuery.data;

  if (statsQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Pendências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendencias = [
    {
      label: "Conversas",
      value: stats?.conversations || 0,
      icon: MessageCircle,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/copiloto"
    },
    {
      label: "Mensagens",
      value: stats?.messages || 0,
      icon: Bot,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/copiloto"
    },
    {
      label: "Eventos Recentes",
      value: stats?.recentEvents || 0,
      icon: Clock,
      color: "text-stone-600",
      bg: "bg-stone-50",
      href: "/copiloto?tab=alertas"
    },
    {
      label: "Insights Ativos",
      value: stats?.activeInsights || 0,
      icon: Lightbulb,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/copiloto?tab=insights"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Pendências
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {pendencias.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href}>
                <div className={cn(
                  "p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow",
                  item.bg
                )}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", item.color)} />
                    <span className={cn("text-lg font-bold", item.color)}>
                      {item.value}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">
                    {item.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Widget de Tendência de Eventos
 */
export function TendenciaEventosWidget() {
  const eventsQuery = trpc.ai.listEvents.useQuery({ limit: 100 });
  
  // Agrupar eventos por dia para o gráfico
  const eventsByDay = (eventsQuery.data || []).reduce((acc: Record<string, number>, event: any) => {
    const date = new Date(event.createdAt).toLocaleDateString("pt-BR", { 
      day: "2-digit", 
      month: "2-digit" 
    });
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(eventsByDay)
    .slice(-7)
    .map(([date, count]) => ({
      date,
      eventos: count
    }));

  if (eventsQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-amber-500" />
            Atividade do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-amber-500" />
          Atividade do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-6 text-stone-500">
            <Bot className="h-8 w-8 mx-auto mb-2 text-stone-300" />
            <p className="text-sm">Sem dados de atividade</p>
          </div>
        ) : (
          <div className="h-24 sm:h-32 touch-pan-y">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 9 }} 
                  stroke="#a8a29e"
                  interval="preserveStartEnd"
                  tickMargin={4}
                />
                <YAxis 
                  tick={{ fontSize: 9 }} 
                  stroke="#a8a29e"
                  allowDecimals={false}
                  width={25}
                  tickMargin={2}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: 11, 
                    borderRadius: 8,
                    border: "1px solid #e7e5e4",
                    padding: "6px 10px"
                  }}
                  wrapperStyle={{ zIndex: 100 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="eventos" 
                  stroke="#d97706" 
                  strokeWidth={2}
                  dot={{ fill: "#d97706", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Widget de Acesso Rápido ao Copiloto
 */
export function CopilotoQuickAccessWidget() {
  const summaryQuery = trpc.ai.getQuickSummary.useQuery();
  const summary = summaryQuery.data;

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-full">
            <Bot className="h-6 w-6 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-stone-800">Copiloto IA</h3>
            <p className="text-sm text-stone-600">
              {typeof summary === 'string' ? summary : "Assistente inteligente para gestão"}
            </p>
          </div>
          <Link href="/copiloto">
            <Button className="bg-amber-600 hover:bg-amber-700">
              Abrir Chat
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
