import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { 
  Plus, 
  FileSpreadsheet, 
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  ArrowRight,
  Copy,
  Trash2,
  Eye,
  Calculator,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Scale
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const SCENARIO_TYPES = [
  { id: "conservador", name: "Conservador", color: "bg-blue-500", description: "Projeções pessimistas, menor risco" },
  { id: "moderado", name: "Moderado", color: "bg-green-500", description: "Projeções equilibradas, risco médio" },
  { id: "otimista", name: "Otimista", color: "bg-orange-500", description: "Projeções agressivas, maior risco" },
  { id: "base_zero", name: "Base Zero (OBZ)", color: "bg-purple-500", description: "Construído do zero, sem histórico" },
];

const SENSITIVITY_VARIABLES = [
  { id: "preco_coco", name: "Preço do Coco", unit: "%", default: 0, min: -30, max: 30 },
  { id: "volume_vendas", name: "Volume de Vendas", unit: "%", default: 0, min: -30, max: 30 },
  { id: "custo_energia", name: "Custo de Energia", unit: "%", default: 0, min: -50, max: 50 },
  { id: "custo_mao_obra", name: "Custo Mão de Obra", unit: "%", default: 0, min: -20, max: 20 },
  { id: "taxa_cambio", name: "Taxa de Câmbio", unit: "%", default: 0, min: -30, max: 30 },
];

export default function OrcamentoCenarios() {
  const [, navigate] = useLocation();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [showNewScenarioDialog, setShowNewScenarioDialog] = useState(false);
  const [showSensitivityDialog, setShowSensitivityDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("comparativo");
  
  // Sensitivity analysis state
  const [sensitivityValues, setSensitivityValues] = useState<Record<string, number>>(
    Object.fromEntries(SENSITIVITY_VARIABLES.map(v => [v.id, v.default]))
  );
  
  // New scenario form
  const [newScenario, setNewScenario] = useState({
    name: "",
    type: "moderado" as string,
    baseScenarioId: null as number | null,
    adjustmentPercent: 0,
    description: "",
  });

  // Queries
  const { data: budgets } = trpc.budget.list.useQuery({ year: selectedYear });
  const { data: scenarios, refetch: refetchScenarios } = trpc.budget.scenarios.list.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );
  const { data: budgetLines } = trpc.budget.lines.list.useQuery(
    { budgetId: selectedBudgetId! },
    { enabled: !!selectedBudgetId }
  );

  // Mutations
  const createScenarioMutation = trpc.budget.scenarios.create.useMutation({
    onSuccess: () => {
      toast.success("Cenário criado com sucesso!");
      setShowNewScenarioDialog(false);
      refetchScenarios();
    },
    onError: () => {
      toast.error("Erro ao criar cenário");
    },
  });

  const deleteScenarioMutation = trpc.budget.scenarios.delete.useMutation({
    onSuccess: () => {
      toast.success("Cenário removido!");
      refetchScenarios();
    },
    onError: () => {
      toast.error("Erro ao remover cenário");
    },
  });

  // Calculate scenario comparison data
  const scenarioComparisonData = useMemo(() => {
    if (!scenarios || scenarios.length === 0) return [];
    
    const categories = ["Receita", "Custos", "Despesas", "Investimentos", "Resultado"];
    return categories.map(cat => {
      const row: Record<string, any> = { name: cat };
      scenarios.forEach((s: any) => {
        // Simulate values based on scenario type
        const baseValue = 100000;
        const multiplier = s.type === "otimista" ? 1.2 : s.type === "conservador" ? 0.85 : 1;
        row[s.name] = Math.round(baseValue * multiplier * (1 + Math.random() * 0.2));
      });
      return row;
    });
  }, [scenarios]);

  // Calculate sensitivity impact
  const sensitivityImpact = useMemo(() => {
    const baseResult = 500000; // Base result
    let impact = 0;
    
    // Preço do coco: +1% preço = -0.5% resultado
    impact += sensitivityValues.preco_coco * -0.5;
    // Volume de vendas: +1% volume = +0.8% resultado
    impact += sensitivityValues.volume_vendas * 0.8;
    // Custo de energia: +1% energia = -0.3% resultado
    impact += sensitivityValues.custo_energia * -0.3;
    // Custo mão de obra: +1% MO = -0.4% resultado
    impact += sensitivityValues.custo_mao_obra * -0.4;
    // Taxa de câmbio: +1% câmbio = -0.2% resultado
    impact += sensitivityValues.taxa_cambio * -0.2;
    
    return {
      baseResult,
      impactPercent: impact,
      newResult: baseResult * (1 + impact / 100),
      variation: baseResult * (impact / 100),
    };
  }, [sensitivityValues]);

  // Radar chart data for scenario comparison
  const radarData = useMemo(() => {
    if (!scenarios || scenarios.length === 0) return [];
    
    const metrics = [
      { metric: "Receita", fullMark: 100 },
      { metric: "Margem", fullMark: 100 },
      { metric: "Risco", fullMark: 100 },
      { metric: "Investimento", fullMark: 100 },
      { metric: "Crescimento", fullMark: 100 },
    ];
    
    return metrics.map(m => {
      const row: Record<string, any> = { metric: m.metric, fullMark: m.fullMark };
      scenarios.forEach((s: any) => {
        const baseValue = 50 + Math.random() * 30;
        const multiplier = s.type === "otimista" ? 1.3 : s.type === "conservador" ? 0.8 : 1;
        row[s.name] = Math.round(baseValue * multiplier);
      });
      return row;
    });
  }, [scenarios]);

  const handleCreateScenario = () => {
    if (!selectedBudgetId) return;
    createScenarioMutation.mutate({
      budgetId: selectedBudgetId,
      name: newScenario.name,
      type: newScenario.type as any,
      revenueAdjustment: String(newScenario.adjustmentPercent),
      expenseAdjustment: String(newScenario.adjustmentPercent),
    });
  };

  const selectedBudget = budgets?.find((b: any) => b.id === selectedBudgetId);
  const scenarioColors = ["#3B82F6", "#10B981", "#F97316", "#8B5CF6", "#EF4444"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Cenários de Orçamento</h1>
            <p className="text-muted-foreground">
              Compare cenários e analise sensibilidade a variáveis
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

            <Select 
              value={selectedBudgetId?.toString() || ""} 
              onValueChange={(v) => setSelectedBudgetId(Number(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione o orçamento" />
              </SelectTrigger>
              <SelectContent>
                {budgets?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setShowNewScenarioDialog(true)} disabled={!selectedBudgetId}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cenário
            </Button>
          </div>
        </div>

        {!selectedBudgetId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Selecione um Orçamento</h3>
              <p className="text-muted-foreground">
                Escolha um orçamento para visualizar e criar cenários
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Scenario Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {SCENARIO_TYPES.map((type) => {
                const scenario = scenarios?.find((s: any) => s.type === type.id);
                return (
                  <Card key={type.id} className={scenario ? "border-2 border-primary" : "opacity-60"}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge className={type.color}>{type.name}</Badge>
                        {scenario && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteScenarioMutation.mutate({ id: scenario.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                      {scenario ? (
                        <div className="space-y-2">
                          <p className="text-lg font-bold">
                            R$ {(Number(scenario.revenueAdjustment) * 10000 || 0).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ajuste: {Number(scenario.revenueAdjustment) > 0 ? "+" : ""}{scenario.revenueAdjustment}%
                          </p>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setNewScenario({ ...newScenario, type: type.id });
                            setShowNewScenarioDialog(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
                <TabsTrigger value="sensibilidade">Análise de Sensibilidade</TabsTrigger>
                <TabsTrigger value="radar">Radar de Cenários</TabsTrigger>
              </TabsList>

              {/* Comparativo Tab */}
              <TabsContent value="comparativo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Comparação entre Cenários</CardTitle>
                    <CardDescription>Visualize as diferenças entre os cenários criados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scenarios && scenarios.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={scenarioComparisonData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                            <Legend />
                            {scenarios.map((s: any, idx: number) => (
                              <Bar 
                                key={s.id} 
                                dataKey={s.name} 
                                fill={scenarioColors[idx % scenarioColors.length]} 
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <Scale className="h-12 w-12 mx-auto mb-4" />
                        <p>Crie pelo menos um cenário para visualizar a comparação</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sensibilidade Tab */}
              <TabsContent value="sensibilidade" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Variáveis de Sensibilidade</CardTitle>
                      <CardDescription>Ajuste as variáveis para simular impacto no resultado</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {SENSITIVITY_VARIABLES.map((variable) => (
                        <div key={variable.id} className="space-y-2">
                          <div className="flex justify-between">
                            <Label>{variable.name}</Label>
                            <span className={`font-mono ${sensitivityValues[variable.id] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {sensitivityValues[variable.id] >= 0 ? "+" : ""}{sensitivityValues[variable.id]}%
                            </span>
                          </div>
                          <Slider
                            value={[sensitivityValues[variable.id]]}
                            min={variable.min}
                            max={variable.max}
                            step={1}
                            onValueChange={([v]) => setSensitivityValues({ ...sensitivityValues, [variable.id]: v })}
                          />
                        </div>
                      ))}
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSensitivityValues(
                          Object.fromEntries(SENSITIVITY_VARIABLES.map(v => [v.id, v.default]))
                        )}
                      >
                        Resetar Valores
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Impacto no Resultado</CardTitle>
                      <CardDescription>Simulação do impacto das variáveis no resultado final</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">Resultado Base</p>
                          <p className="text-2xl font-bold">
                            R$ {sensitivityImpact.baseResult.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${sensitivityImpact.impactPercent >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                          <p className="text-sm text-muted-foreground">Resultado Simulado</p>
                          <p className={`text-2xl font-bold ${sensitivityImpact.impactPercent >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            R$ {sensitivityImpact.newResult.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Variação</span>
                          <span className={`text-lg font-bold ${sensitivityImpact.impactPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {sensitivityImpact.impactPercent >= 0 ? "+" : ""}{sensitivityImpact.impactPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {sensitivityImpact.impactPercent >= 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                          <span className={sensitivityImpact.impactPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                            R$ {Math.abs(sensitivityImpact.variation).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800">Variável mais sensível</p>
                            <p className="text-sm text-amber-700">
                              Volume de Vendas tem o maior impacto no resultado (+0.8% por ponto percentual)
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Radar Tab */}
              <TabsContent value="radar" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Radar de Cenários</CardTitle>
                    <CardDescription>Comparação multidimensional dos cenários</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scenarios && scenarios.length > 0 ? (
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="metric" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            {scenarios.map((s: any, idx: number) => (
                              <Radar
                                key={s.id}
                                name={s.name}
                                dataKey={s.name}
                                stroke={scenarioColors[idx % scenarioColors.length]}
                                fill={scenarioColors[idx % scenarioColors.length]}
                                fillOpacity={0.3}
                              />
                            ))}
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4" />
                        <p>Crie cenários para visualizar o radar comparativo</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* New Scenario Dialog */}
        <Dialog open={showNewScenarioDialog} onOpenChange={setShowNewScenarioDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Cenário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Cenário</Label>
                <Input
                  value={newScenario.name}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                  placeholder="Ex: Cenário Conservador 2026"
                />
              </div>
              <div>
                <Label>Tipo de Cenário</Label>
                <Select 
                  value={newScenario.type} 
                  onValueChange={(v) => setNewScenario({ ...newScenario, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIO_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ajuste Percentual sobre Base</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[newScenario.adjustmentPercent]}
                    min={-30}
                    max={30}
                    step={1}
                    onValueChange={([v]) => setNewScenario({ ...newScenario, adjustmentPercent: v })}
                    className="flex-1"
                  />
                  <span className="font-mono w-16 text-right">
                    {newScenario.adjustmentPercent >= 0 ? "+" : ""}{newScenario.adjustmentPercent}%
                  </span>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={newScenario.description}
                  onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                  placeholder="Descrição do cenário..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewScenarioDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateScenario} disabled={!newScenario.name}>
                Criar Cenário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
