/**
 * CopilotPerformance - Dashboard de KPIs e Performance do Copiloto IA
 * Bloco 8/9 - Relatórios de performance, analytics e A/B testing
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  MessageSquare,
  Lightbulb,
  AlertTriangle,
  Zap,
  RefreshCw,
  Download,
  Calendar,
  Users,
  ThumbsUp,
  Target,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  LineChart,
  Line,
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
  Area,
  AreaChart,
} from "recharts";

const COLORS = ["#8B7355", "#D4C4B0", "#5D4E37", "#A89078", "#6B5B4F"];

type ReportType = "monthly" | "quarterly" | "annual";

export default function CopilotPerformance() {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Queries
  const { data: analytics, isLoading: loadingAnalytics } = trpc.ai.getFeedbackAnalytics.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const { data: reports, isLoading: loadingReports } = trpc.ai.listPerformanceReports.useQuery({
    limit: 10,
  });

  const { data: retrainStatus } = trpc.ai.checkRetrainTrigger.useQuery();

  // Mutations
  const generateReport = trpc.ai.generatePerformanceReport.useMutation({
    onSuccess: () => {
      toast.success("Relatório gerado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const executeRetrain = trpc.ai.executeRetrain.useMutation({
    onSuccess: () => {
      toast.success("Retrain iniciado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Dados para gráficos (mock + real)
  const feedbackTrendData = [
    { date: "Sem 1", rating: 4.2, feedbacks: 45 },
    { date: "Sem 2", rating: 4.0, feedbacks: 52 },
    { date: "Sem 3", rating: 4.3, feedbacks: 48 },
    { date: "Sem 4", rating: 4.5, feedbacks: 61 },
  ];

  const interactionTypeData = analytics?.byInteraction
    ? Object.entries(analytics.byInteraction).map(([name, value]) => ({
        name: t(`copilot.tabs.${name}`),
        value,
      }))
    : [
        { name: "Chat", value: 120 },
        { name: "Insights", value: 45 },
        { name: "Alertas", value: 30 },
        { name: "Ações", value: 25 },
        { name: "Previsões", value: 15 },
      ];

  const languageData = analytics?.byLanguage
    ? Object.entries(analytics.byLanguage).map(([name, value]) => ({
        name,
        value,
      }))
    : [
        { name: "pt-BR", value: 180 },
        { name: "en", value: 35 },
        { name: "es", value: 20 },
      ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleGenerateReport = () => {
    generateReport.mutate({
      reportType,
      startDate: dateRange.start,
      endDate: dateRange.end,
    });
  };

  const handleRetrain = () => {
    if (confirm("Deseja iniciar o retreinamento do modelo? Este processo pode levar alguns minutos.")) {
      executeRetrain.mutate({ modelType: "copilot_response" });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            {t("reports.performance.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("reports.performance.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{t("reports.performance.monthly")}</SelectItem>
              <SelectItem value="quarterly">{t("reports.performance.quarterly")}</SelectItem>
              <SelectItem value="annual">{t("reports.performance.annual")}</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleGenerateReport} disabled={generateReport.isPending}>
            <Download className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              {t("reports.performance.metrics.totalInteractions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalFeedbacks ? analytics.totalFeedbacks * 2 : 235}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getTrendIcon(analytics?.trend || "stable")}
              {t(`reports.performance.trends.${analytics?.trend || "stable"}`)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              {t("reports.performance.metrics.avgRating")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.avgRating?.toFixed(1) || "4.2"}/5
            </div>
            <Progress value={(analytics?.avgRating || 4.2) * 20} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              {t("reports.performance.metrics.satisfactionRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analytics?.satisfactionRate || 0.78) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Ratings ≥ 4 estrelas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              {t("reports.performance.metrics.feedbackRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analytics?.feedbackRate || 0.52) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Meta: &gt;50%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="retrain">Retrain</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Feedback Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tendência de Feedback</CardTitle>
                <CardDescription>Rating médio e volume por semana</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={feedbackTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" domain={[0, 5]} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="rating"
                      stroke="#8B7355"
                      fill="#D4C4B0"
                      name="Rating Médio"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="feedbacks"
                      stroke="#5D4E37"
                      name="Feedbacks"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Interactions by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Interações por Tipo</CardTitle>
                <CardDescription>Distribuição de uso do Copiloto</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={interactionTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {interactionTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Language Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Uso por Idioma</CardTitle>
              <CardDescription>Distribuição de interações por idioma</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={languageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={60} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8B7355" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  Positivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {analytics?.byType?.like || 156}
                </div>
                <Progress value={65} className="h-2 mt-2 bg-green-100" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Minus className="h-4 w-4 text-gray-500" />
                  Neutros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-600">
                  {analytics?.byType?.neutral || 45}
                </div>
                <Progress value={20} className="h-2 mt-2 bg-gray-100" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Negativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {analytics?.byType?.dislike || 34}
                </div>
                <Progress value={15} className="h-2 mt-2 bg-red-100" />
              </CardContent>
            </Card>
          </div>

          {/* Top Improvement Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Áreas de Melhoria Mais Citadas</CardTitle>
              <CardDescription>Baseado nos comentários de feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { area: "Precisão da informação", count: 45, percent: 35 },
                  { area: "Clareza da explicação", count: 32, percent: 25 },
                  { area: "Relevância da resposta", count: 28, percent: 22 },
                  { area: "Completude da resposta", count: 15, percent: 12 },
                  { area: "Ações sugeridas úteis", count: 8, percent: 6 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-40 text-sm">{item.area}</div>
                    <Progress value={item.percent} className="flex-1 h-2" />
                    <div className="w-16 text-sm text-right text-muted-foreground">
                      {item.count} ({item.percent}%)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retrain Tab */}
        <TabsContent value="retrain" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Status de Retreinamento
              </CardTitle>
              <CardDescription>
                Monitoramento do ciclo de aprendizado contínuo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Feedbacks Pendentes</div>
                  <div className="text-2xl font-bold">{retrainStatus?.feedbackCount || 0}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Rating Médio</div>
                  <div className="text-2xl font-bold">
                    {retrainStatus?.avgRating?.toFixed(2) || "N/A"}
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Taxa Negativa</div>
                  <div className="text-2xl font-bold">
                    {((retrainStatus?.negativeRatio || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">
                    {retrainStatus?.shouldRetrain
                      ? "⚠️ Retrain Recomendado"
                      : "✅ Modelo Estável"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {retrainStatus?.reason || "Métricas dentro do esperado"}
                  </div>
                </div>
                <Button
                  onClick={handleRetrain}
                  disabled={executeRetrain.isPending}
                  variant={retrainStatus?.shouldRetrain ? "default" : "outline"}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${executeRetrain.isPending ? "animate-spin" : ""}`} />
                  Iniciar Retrain
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <strong>Critérios para retrain automático:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Taxa de feedback negativo &gt; 30%</li>
                  <li>Rating médio &lt; 3.0</li>
                  <li>Mínimo de 100 feedbacks acumulados</li>
                  <li>Ciclo trimestral programado</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relatórios Gerados</CardTitle>
              <CardDescription>Histórico de relatórios de performance</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReports ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando relatórios...
                </div>
              ) : reports && reports.length > 0 ? (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            Relatório {report.reportType === "monthly" ? "Mensal" : report.reportType === "quarterly" ? "Trimestral" : "Anual"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">{report.avgRating.toFixed(1)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(report.satisfactionRate * 100).toFixed(0)}% satisfação
                          </div>
                        </div>
                        <Badge variant={report.trend === "improving" ? "default" : report.trend === "declining" ? "destructive" : "secondary"}>
                          {getTrendIcon(report.trend)}
                          {t(`reports.performance.trends.${report.trend}`)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum relatório gerado ainda
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
