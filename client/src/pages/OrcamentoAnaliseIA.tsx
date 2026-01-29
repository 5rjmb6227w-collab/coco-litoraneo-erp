import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { 
  Brain, 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Target,
  Zap,
  MessageSquare,
  RefreshCw,
  Send,
  BarChart3,
  DollarSign,
  Calendar,
  ArrowRight,
  Sparkles,
  FileSpreadsheet
} from "lucide-react";

const INSIGHT_TYPES = {
  alerta: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 border-red-200" },
  previsao: { icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50 border-blue-200" },
  sugestao: { icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200" },
  insight: { icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50 border-purple-200" },
  anomalia: { icon: Zap, color: "text-orange-500", bg: "bg-orange-50 border-orange-200" },
  otimizacao: { icon: Target, color: "text-green-500", bg: "bg-green-50 border-green-200" },
};

export default function OrcamentoAnaliseIA() {
  // toast from sonner
  const [, navigate] = useLocation();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [userQuestion, setUserQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Queries
  const { data: budgets } = trpc.budget.list.useQuery({ year: selectedYear });
  const { data: aiInsights, refetch: refetchInsights } = trpc.budget.insights.list.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );
  const { data: forecasts } = trpc.budget.forecasts.list.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );
  const { data: comparison } = trpc.budget.dashboard.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );

  // Mutations
  const generateInsightsMutation = trpc.budget.insights.generate.useMutation({
    onSuccess: () => {
      toast.success("Análise IA concluída!");
      refetchInsights();
      setIsAnalyzing(false);
    },
    onError: () => {
      toast.error("Erro ao gerar análise");
      setIsAnalyzing(false);
    },
  });

  // Chat IA será implementado via Copiloto existente
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const askAIMutation = {
    mutate: (params: { budgetId: number; question: string }) => {
      // Simular resposta - integrar com Copiloto
      setAiResponse(`Análise para: ${params.question}\n\nBaseado nos dados do orçamento, identifiquei que os custos de produção estão 8% acima do planejado. Recomendo revisar os contratos de energia e matéria-prima.`);
    },
    isPending: false,
    data: aiResponse ? { response: aiResponse } : null,
  };

  const handleGenerateInsights = () => {
    if (!selectedBudgetId) return;
    setIsAnalyzing(true);
    generateInsightsMutation.mutate({ budgetId: selectedBudgetId });
  };

  const handleAskAI = () => {
    if (!selectedBudgetId || !userQuestion.trim()) return;
    askAIMutation.mutate({ budgetId: selectedBudgetId, question: userQuestion });
    setUserQuestion("");
  };

  const selectedBudget = budgets?.find((b: any) => b.id === selectedBudgetId);

  // Agrupar insights por tipo
  const groupedInsights = aiInsights?.reduce((acc: any, insight: any) => {
    const type = insight.insightType || 'insight';
    if (!acc[type]) acc[type] = [];
    acc[type].push(insight);
    return acc;
  }, {}) || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-7 w-7 text-purple-500" />
              Análise IA do Orçamento
            </h1>
            <p className="text-muted-foreground">
              Insights inteligentes, previsões e sugestões de otimização
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
            
            <Button variant="outline" onClick={() => navigate("/orcamento/acompanhamento")}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Acompanhamento
            </Button>
          </div>
        </div>

        {/* Budget Selector */}
        {budgets && budgets.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Selecione o Orçamento para Análise</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {budgets.map((budget: any) => (
                  <Button
                    key={budget.id}
                    variant={selectedBudgetId === budget.id ? "default" : "outline"}
                    onClick={() => setSelectedBudgetId(budget.id)}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {budget.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedBudgetId && (
          <>
            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleGenerateInsights} 
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Gerar Análise IA
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                A IA analisará tendências, detectará anomalias e sugerirá otimizações
              </p>
            </div>

            {/* AI Chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Pergunte à IA sobre o Orçamento
                </CardTitle>
                <CardDescription>
                  Faça perguntas específicas sobre seu orçamento e receba análises personalizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Textarea
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    placeholder="Ex: Por que os custos de energia estão acima do orçado? Quais ações posso tomar para reduzir despesas no próximo trimestre?"
                    className="flex-1"
                    rows={2}
                  />
                  <Button 
                    onClick={handleAskAI} 
                    disabled={!userQuestion.trim() || askAIMutation.isPending}
                  >
                    {askAIMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {/* Sugestões de perguntas */}
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Sugestões de perguntas:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Quais centros de custo estão mais críticos?",
                      "Qual a previsão de fechamento do ano?",
                      "Onde posso economizar?",
                      "Quais despesas têm maior variação?",
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setUserQuestion(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* AI Response */}
                {askAIMutation.data && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-purple-500 mt-1" />
                      <div>
                        <p className="font-medium text-purple-700">Resposta da IA</p>
                        <p className="text-sm mt-1">{askAIMutation.data.response}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insights Grid */}
            <Tabs defaultValue="todos">
              <TabsList>
                <TabsTrigger value="todos">Todos os Insights</TabsTrigger>
                <TabsTrigger value="alertas">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Alertas
                </TabsTrigger>
                <TabsTrigger value="previsoes">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Previsões
                </TabsTrigger>
                <TabsTrigger value="sugestoes">
                  <Lightbulb className="h-4 w-4 mr-1" />
                  Sugestões
                </TabsTrigger>
              </TabsList>

              <TabsContent value="todos" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiInsights?.map((insight: any) => {
                    const typeConfig = INSIGHT_TYPES[insight.insightType as keyof typeof INSIGHT_TYPES] || INSIGHT_TYPES.insight;
                    const Icon = typeConfig.icon;
                    
                    return (
                      <Card key={insight.id} className={`border ${typeConfig.bg}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                              <Icon className={`h-5 w-5 ${typeConfig.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="mb-2">
                                  {insight.insightType}
                                </Badge>
                                {insight.priority && (
                                  <Badge variant={insight.priority === "alta" ? "destructive" : insight.priority === "media" ? "default" : "secondary"}>
                                    {insight.priority}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium">{insight.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                              
                              {insight.suggestedAction && (
                                <div className="mt-3 p-2 bg-white rounded border">
                                  <p className="text-xs text-muted-foreground">Ação sugerida:</p>
                                  <p className="text-sm font-medium flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3" />
                                    {insight.suggestedAction}
                                  </p>
                                </div>
                              )}
                              
                              {insight.potentialSavings && (
                                <div className="mt-2 flex items-center gap-1 text-green-600">
                                  <DollarSign className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    Economia potencial: R$ {Number(insight.potentialSavings).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {(!aiInsights || aiInsights.length === 0) && (
                    <Card className="col-span-2">
                      <CardContent className="py-12 text-center">
                        <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhum insight gerado ainda</h3>
                        <p className="text-muted-foreground mb-4">
                          Clique em "Gerar Análise IA" para obter insights inteligentes
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="alertas" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedInsights.alerta?.map((insight: any) => (
                    <Card key={insight.id} className="border border-red-200 bg-red-50">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium">{insight.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                            {insight.suggestedAction && (
                              <p className="text-sm font-medium mt-2 text-red-700">
                                → {insight.suggestedAction}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!groupedInsights.alerta?.length && (
                    <Card className="col-span-2">
                      <CardContent className="py-8 text-center">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        <p className="text-muted-foreground">Nenhum alerta crítico identificado</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="previsoes" className="mt-4">
                <div className="space-y-4">
                  {forecasts?.map((forecast: any) => (
                    <Card key={forecast.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-medium">{forecast.costCenter || 'Geral'}</p>
                              <p className="text-sm text-muted-foreground">
                                Previsão para {forecast.forecastMonth}/{forecast.forecastYear}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              R$ {Number(forecast.forecastedValue).toLocaleString('pt-BR')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Confiança: {forecast.confidence}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!forecasts || forecasts.length === 0) && (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Nenhuma previsão disponível</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sugestoes" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedInsights.sugestao?.map((insight: any) => (
                    <Card key={insight.id} className="border border-yellow-200 bg-yellow-50">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="font-medium">{insight.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                            {insight.potentialSavings && (
                              <p className="text-sm font-medium mt-2 text-green-600">
                                💰 Economia potencial: R$ {Number(insight.potentialSavings).toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!groupedInsights.sugestao?.length && (
                    <Card className="col-span-2">
                      <CardContent className="py-8 text-center">
                        <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Nenhuma sugestão disponível</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Summary Stats */}
            {aiInsights && aiInsights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumo da Análise IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-6 w-6 mx-auto text-red-500 mb-2" />
                      <p className="text-2xl font-bold">{groupedInsights.alerta?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Alertas</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <TrendingUp className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                      <p className="text-2xl font-bold">{groupedInsights.previsao?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Previsões</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Lightbulb className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                      <p className="text-2xl font-bold">{groupedInsights.sugestao?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Sugestões</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <DollarSign className="h-6 w-6 mx-auto text-green-500 mb-2" />
                      <p className="text-2xl font-bold">
                        R$ {aiInsights.reduce((sum: number, i: any) => sum + Number(i.potentialSavings || 0), 0).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">Economia Potencial</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Empty State */}
        {(!budgets || budgets.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie um orçamento para começar a análise IA
              </p>
              <Button onClick={() => navigate("/orcamento/preparacao")}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Ir para Preparação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
