/**
 * Dashboard de Previsões ML - Interface interativa com Recharts
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
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
import {
  Brain,
  TrendingUp,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Zap,
  BarChart3,
  Activity,
} from "lucide-react";

const COLORS = ["#8B5A2B", "#D4A574", "#F5DEB3", "#A0522D", "#CD853F"];

export function PredictionsDashboard() {
  const [selectedModule, setSelectedModule] = useState<string>("production");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30days");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = trpc.ai.getMLDashboard.useQuery();
  const { data: accuracy, isLoading: accuracyLoading } = trpc.ai.getPredictionAccuracy.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.ai.getPredictionHistory.useQuery({ days: 30 });
  const { data: predictions, isLoading: predictionsLoading, refetch: refetchPredictions } = trpc.ai.listPredictions.useQuery({ limit: 10 });

  const generateMutation = trpc.ai.generatePrediction.useMutation({
    onSuccess: () => {
      toast.success("Previsão gerada com sucesso!");
      refetchDashboard();
      refetchPredictions();
    },
    onError: (error) => {
      toast.error(`Erro ao gerar previsão: ${error.message}`);
    },
  });

  const handleGeneratePrediction = async () => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync({
        module: selectedModule as any,
        period: selectedPeriod as any,
        confidenceLevel: "high",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getConfidenceBadge = (accuracy: number) => {
    if (accuracy >= 90) return <Badge className="bg-green-500">Alta ({accuracy}%)</Badge>;
    if (accuracy >= 70) return <Badge className="bg-yellow-500">Média ({accuracy}%)</Badge>;
    return <Badge className="bg-red-500">Baixa ({accuracy}%)</Badge>;
  };

  const getModelIcon = (modelType: string) => {
    switch (modelType) {
      case "demand_forecast": return <TrendingUp className="h-4 w-4" />;
      case "inventory_forecast": return <BarChart3 className="h-4 w-4" />;
      case "quality_prediction": return <Target className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getModelName = (modelType: string) => {
    switch (modelType) {
      case "demand_forecast": return "Previsão de Demanda";
      case "inventory_forecast": return "Previsão de Estoque";
      case "quality_prediction": return "Previsão de Qualidade";
      default: return modelType;
    }
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Previsões</CardTitle>
            <Brain className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalPredictions || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acurácia Média</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.avgAccuracy || 0}%</div>
            <p className="text-xs text-muted-foreground">Todos os modelos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.avgExecutionTime || 0}ms</div>
            <p className="text-xs text-muted-foreground">Por previsão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modelos Ativos</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.modelBreakdown?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Em produção</p>
          </CardContent>
        </Card>
      </div>

      {/* Gerador de Previsões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            Gerar Nova Previsão
          </CardTitle>
          <CardDescription>
            Selecione o módulo e período para gerar uma previsão sob demanda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Módulo</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione o módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Produção</SelectItem>
                  <SelectItem value="warehouse">Estoque</SelectItem>
                  <SelectItem value="quality">Qualidade</SelectItem>
                  <SelectItem value="financial">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 dias</SelectItem>
                  <SelectItem value="30days">30 dias</SelectItem>
                  <SelectItem value="90days">90 dias</SelectItem>
                  <SelectItem value="1year">1 ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleGeneratePrediction} 
              disabled={isGenerating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Gerar Previsão
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Gráficos */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Histórico</TabsTrigger>
          <TabsTrigger value="accuracy">Acurácia</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="recent">Recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Previsões (30 dias)</CardTitle>
              <CardDescription>Volume de previsões e acurácia média por dia</CardDescription>
            </CardHeader>
            <CardContent>
              {history && history.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v) => v.split("-").slice(1).join("/")} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="predictions"
                      name="Previsões"
                      stroke="#8B5A2B"
                      fill="#D4A574"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgAccuracy"
                      name="Acurácia (%)"
                      stroke="#22c55e"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma previsão gerada ainda</p>
                    <p className="text-sm">Gere sua primeira previsão acima</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accuracy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acurácia por Modelo</CardTitle>
              <CardDescription>Comparativo de precisão entre os modelos de ML</CardDescription>
            </CardHeader>
            <CardContent>
              {accuracy?.models && accuracy.models.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={accuracy.models}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="modelType" tickFormatter={getModelName} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Acurácia"]} />
                    <Bar dataKey="avgAccuracy" name="Acurácia" fill="#8B5A2B">
                      {accuracy.models.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado de acurácia disponível</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Modelo</CardTitle>
              <CardDescription>Quantidade de previsões por tipo de modelo</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.modelBreakdown && dashboard.modelBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={dashboard.modelBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${getModelName(name)} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dashboard.modelBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-4">
                    {dashboard.modelBreakdown.map((model, index) => (
                      <div key={model.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{getModelName(model.name)}</span>
                        </div>
                        <Badge variant="outline">{model.value} previsões</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum modelo ativo</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Previsões Recentes</CardTitle>
              <CardDescription>Últimas previsões geradas pelo sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {predictions && predictions.length > 0 ? (
                <div className="space-y-4">
                  {predictions.map((prediction: any) => (
                    <div 
                      key={prediction.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          {getModelIcon(prediction.modelType)}
                        </div>
                        <div>
                          <p className="font-medium">{getModelName(prediction.modelType)}</p>
                          <p className="text-sm text-muted-foreground">
                            Módulo: {prediction.module} | Período: {prediction.period}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getConfidenceBadge(Math.round((Number(prediction.accuracyEstimate) || 0.85) * 100))}
                        <div className="text-right">
                          <p className="text-sm font-medium">{prediction.executionTimeMs || 0}ms</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(prediction.generatedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma previsão recente</p>
                    <p className="text-sm">Gere sua primeira previsão acima</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tutorial CEO */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Como Interpretar as Previsões
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Alta Confiança (≥90%)
              </h4>
              <p className="text-sm">
                Previsões com alta probabilidade de acerto. Pode tomar decisões baseadas nelas com segurança.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                Média Confiança (70-89%)
              </h4>
              <p className="text-sm">
                Previsões úteis para planejamento, mas considere fatores externos antes de agir.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Baixa Confiança (&lt;70%)
              </h4>
              <p className="text-sm">
                Use apenas como referência. Dados insuficientes ou padrões inconsistentes detectados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PredictionsDashboard;
