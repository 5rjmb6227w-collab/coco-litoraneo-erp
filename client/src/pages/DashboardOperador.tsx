import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Package,
  Target,
  Zap,
  ClipboardList,
  Timer,
  Activity,
  ArrowRight
} from "lucide-react";

export default function DashboardOperador() {
  const [, navigate] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, []);

  // Queries
  const { data: stats } = trpc.dashboard.stats.useQuery(dateRange);

  // Formatação de números
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("pt-BR").format(num);
  };

  // Turno atual
  const getCurrentShift = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 14) return { name: "Manhã", start: "06:00", end: "14:00" };
    if (hour >= 14 && hour < 22) return { name: "Tarde", start: "14:00", end: "22:00" };
    return { name: "Noite", start: "22:00", end: "06:00" };
  };

  const currentShift = getCurrentShift();

  // Progresso do turno
  const getShiftProgress = () => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    if (currentShift.name === "Manhã") {
      const start = 6 * 60;
      const end = 14 * 60;
      return Math.min(100, Math.max(0, ((totalMinutes - start) / (end - start)) * 100));
    } else if (currentShift.name === "Tarde") {
      const start = 14 * 60;
      const end = 22 * 60;
      return Math.min(100, Math.max(0, ((totalMinutes - start) / (end - start)) * 100));
    } else {
      // Noite é mais complexo pois cruza a meia-noite
      if (hour >= 22) {
        const start = 22 * 60;
        const end = 30 * 60; // 6:00 do dia seguinte
        return ((totalMinutes - start) / (end - start)) * 100;
      } else {
        const elapsed = (6 * 60) + totalMinutes; // minutos desde 22:00
        return (elapsed / (8 * 60)) * 100;
      }
    }
  };

  // Dados simulados de OPs do turno
  const currentOPs = [
    { id: "OP-2026-0015", sku: "Coco Ralado 500g", variation: "Flocos", target: 500, produced: 423, status: "em_producao" },
    { id: "OP-2026-0016", sku: "Coco Ralado 1kg", variation: "Médio", target: 300, produced: 0, status: "aguardando" },
    { id: "OP-2026-0017", sku: "Coco Ralado 250g", variation: "Fino", target: 800, produced: 800, status: "finalizado" },
  ];

  // Checklist do turno
  const checklistItems = [
    { item: "Verificar limpeza das máquinas", done: true },
    { item: "Conferir calibração das balanças", done: true },
    { item: "Registrar temperatura câmara fria", done: false },
    { item: "Verificar estoque de embalagens", done: false },
    { item: "Preencher relatório de produção", done: false },
  ];

  const completedChecklist = checklistItems.filter(i => i.done).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header com Relógio */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Dashboard Operador
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de produção do turno
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold text-primary">
            {currentTime.toLocaleTimeString("pt-BR")}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Info do Turno */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Turno {currentShift.name}</h2>
                <p className="text-muted-foreground">{currentShift.start} - {currentShift.end}</p>
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span>Progresso do Turno</span>
                <span>{getShiftProgress().toFixed(0)}%</span>
              </div>
              <Progress value={getShiftProgress()} className="h-3" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {formatNumber(stats?.production?.total ? Math.round(stats.production.total / 7) : 0)} kg
              </div>
              <div className="text-sm text-muted-foreground">Produzido Hoje</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OPs do Turno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Ordens de Produção do Turno
          </CardTitle>
          <CardDescription>Acompanhamento em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentOPs.map((op, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border-2 ${
                  op.status === "em_producao" 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                    : op.status === "finalizado"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-muted bg-muted/30"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      op.status === "em_producao" 
                        ? "bg-blue-500" 
                        : op.status === "finalizado"
                        ? "bg-green-500"
                        : "bg-muted-foreground"
                    }`}>
                      {op.status === "em_producao" ? (
                        <Play className="h-6 w-6 text-white" />
                      ) : op.status === "finalizado" ? (
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      ) : (
                        <Pause className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{op.id}</span>
                        <Badge variant={op.status === "em_producao" ? "default" : op.status === "finalizado" ? "secondary" : "outline"}>
                          {op.status === "em_producao" ? "Em Produção" : op.status === "finalizado" ? "Finalizado" : "Aguardando"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{op.sku} - {op.variation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatNumber(op.produced)}</div>
                      <div className="text-sm text-muted-foreground">Produzido</div>
                    </div>
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatNumber(op.target)}</div>
                      <div className="text-sm text-muted-foreground">Meta</div>
                    </div>
                    <div className="w-32">
                      <Progress value={(op.produced / op.target) * 100} className="h-3" />
                      <div className="text-sm text-center mt-1">
                        {((op.produced / op.target) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid de Ações e Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>Registros de produção</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                className="h-24 flex flex-col gap-2" 
                onClick={() => navigate("/producao/apontamentos")}
              >
                <Package className="h-8 w-8" />
                <span>Novo Apontamento</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => navigate("/producao/expandida")}
              >
                <AlertTriangle className="h-8 w-8" />
                <span>Registrar Parada</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => navigate("/producao/expandida")}
              >
                <Target className="h-8 w-8" />
                <span>Registrar Perda</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2"
                onClick={() => navigate("/qualidade/analises")}
              >
                <ClipboardList className="h-8 w-8" />
                <span>Nova Análise</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Checklist do Turno */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Checklist do Turno
                </CardTitle>
                <CardDescription>Tarefas obrigatórias</CardDescription>
              </div>
              <Badge variant={completedChecklist === checklistItems.length ? "default" : "secondary"}>
                {completedChecklist}/{checklistItems.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklistItems.map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    item.done 
                      ? "bg-green-50 dark:bg-green-900/20" 
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                  onClick={() => navigate("/producao/expandida")}
                >
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                  )}
                  <span className={item.done ? "line-through text-muted-foreground" : ""}>
                    {item.item}
                  </span>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" onClick={() => navigate("/producao/expandida")}>
              Abrir Checklist Completo
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores do Turno */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Timer className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">7h 23min</div>
            <div className="text-sm text-muted-foreground">Tempo Produtivo</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Pause className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold">37min</div>
            <div className="text-sm text-muted-foreground">Tempo Parado</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">94%</div>
            <div className="text-sm text-muted-foreground">Eficiência</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">2.1%</div>
            <div className="text-sm text-muted-foreground">Perda</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
