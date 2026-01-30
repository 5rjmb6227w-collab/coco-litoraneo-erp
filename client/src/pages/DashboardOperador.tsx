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
  ArrowRight,
  Circle
} from "lucide-react";

// Componente Timeline de Produção (estilo sistema externo)
function ProductionTimeline({ events }: { events: { time: string; event: string; status: string; machine: string }[] }) {
  return (
    <div className="space-y-1">
      {events.map((event, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">{event.time}</span>
          <div className={`h-2 flex-1 rounded ${
            event.status === "running" ? "bg-green-500" :
            event.status === "stopped" ? "bg-red-500" :
            event.status === "maintenance" ? "bg-yellow-500" :
            "bg-muted"
          }`} />
          <span className="text-xs w-20 truncate">{event.machine}</span>
        </div>
      ))}
    </div>
  );
}

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
    if (hour >= 6 && hour < 14) return { name: "Manhã", start: "06:00", end: "14:00", startHour: 6, endHour: 14 };
    if (hour >= 14 && hour < 22) return { name: "Tarde", start: "14:00", end: "22:00", startHour: 14, endHour: 22 };
    return { name: "Noite", start: "22:00", end: "06:00", startHour: 22, endHour: 6 };
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

  // Tempo restante do turno
  const getTimeRemaining = () => {
    const progress = getShiftProgress();
    const totalMinutes = 8 * 60; // 8 horas por turno
    const remainingMinutes = Math.round(totalMinutes * (1 - progress / 100));
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    return `${hours}h ${minutes}min`;
  };

  // Dados simulados de OPs do turno
  const currentOPs = [
    { id: "OP-2026-0015", sku: "Coco Ralado 500g", variation: "Flocos", target: 500, produced: 423, status: "em_producao" },
    { id: "OP-2026-0016", sku: "Coco Ralado 1kg", variation: "Médio", target: 300, produced: 0, status: "aguardando" },
    { id: "OP-2026-0017", sku: "Coco Ralado 250g", variation: "Fino", target: 800, produced: 800, status: "finalizado" },
  ];

  // Timeline de produção (estilo sistema externo)
  const productionTimeline = useMemo(() => {
    const machines = ["Descascador", "Ralador", "Prensa", "Secador", "Embalagem"];
    const times = ["06:00", "08:00", "10:00", "12:00", "14:00"];
    return machines.map((machine) => ({
      machine,
      events: times.map((time) => ({
        time,
        event: "Produção",
        status: Math.random() > 0.2 ? "running" : Math.random() > 0.5 ? "stopped" : "maintenance",
        machine,
      })),
    }));
  }, []);

  // Checklist do turno
  const checklistItems = [
    { item: "Verificar limpeza das máquinas", done: true },
    { item: "Conferir calibração das balanças", done: true },
    { item: "Registrar temperatura câmara fria", done: false },
    { item: "Verificar estoque de embalagens", done: false },
    { item: "Preencher relatório de produção", done: false },
  ];

  const completedChecklist = checklistItems.filter(i => i.done).length;

  // Alertas do operador
  const operatorAlerts = [
    { type: "warning", message: "Estoque baixo de embalagens", time: "Há 15 min" },
    { type: "info", message: "Manutenção preventiva às 14h", time: "Há 1 hora" },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header com Relógio */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Chão de Fábrica
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

      {/* Barra de Progresso do Turno - Estilo Sistema Externo */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                  <Clock className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Turno {currentShift.name}</h2>
                  <p className="text-muted-foreground">{currentShift.start} - {currentShift.end}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {formatNumber(stats?.production?.total ? Math.round(stats.production.total / 7) : 0)} kg
                </div>
                <div className="text-sm text-muted-foreground">Produzido Hoje</div>
              </div>
            </div>
            
            {/* Barra de Progresso Grande - Estilo Sistema Externo */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Progresso do Turno</span>
                <span className="font-bold text-primary">{getShiftProgress().toFixed(0)}% • Restam {getTimeRemaining()}</span>
              </div>
              <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-1000"
                  style={{ width: `${getShiftProgress()}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white drop-shadow">{getShiftProgress().toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Produção Ativa - Estilo Sistema Externo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Ordens de Produção do Turno
              </CardTitle>
              <CardDescription>Acompanhamento em tempo real</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => navigate("/producao/expandida")}>
                <Play className="h-4 w-4 mr-1" />
                Iniciar OP
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/producao/expandida")}>
                <Pause className="h-4 w-4 mr-1" />
                Pausar OP
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentOPs.map((op, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border-2 ${
                  op.status === "em_producao" 
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20" 
                    : op.status === "finalizado"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-muted bg-muted/30"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      op.status === "em_producao" 
                        ? "bg-cyan-500" 
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

      {/* Timeline de Produção e Alertas - Estilo Sistema Externo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline de Produção */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Timeline de Produção
            </CardTitle>
            <CardDescription>Status das máquinas ao longo do turno</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Legenda */}
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                  <span>Rodando</span>
                </div>
                <div className="flex items-center gap-1">
                  <Circle className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  <span>Manutenção</span>
                </div>
                <div className="flex items-center gap-1">
                  <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                  <span>Parada</span>
                </div>
              </div>
              
              {/* Timeline por máquina */}
              {productionTimeline.map((machine, index) => (
                <div key={index} className="space-y-1">
                  <span className="text-sm font-medium">{machine.machine}</span>
                  <div className="flex gap-1">
                    {machine.events.map((event, eventIndex) => (
                      <div 
                        key={eventIndex}
                        className={`h-4 flex-1 rounded ${
                          event.status === "running" ? "bg-green-500" :
                          event.status === "maintenance" ? "bg-yellow-500" :
                          "bg-red-500"
                        }`}
                        title={`${event.time} - ${event.status}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Escala de tempo */}
              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>06:00</span>
                <span>08:00</span>
                <span>10:00</span>
                <span>12:00</span>
                <span>14:00</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas do Operador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas
            </CardTitle>
            <CardDescription>Notificações importantes para o turno</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operatorAlerts.map((alert, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    alert.type === "warning" 
                      ? "bg-yellow-50 dark:bg-yellow-900/20" 
                      : "bg-blue-50 dark:bg-blue-900/20"
                  }`}
                >
                  {alert.type === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Indicadores rápidos */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Lotes Produzidos</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">15 min</p>
                <p className="text-xs text-muted-foreground">Tempo de Ciclo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                className="h-24 flex flex-col gap-2 bg-cyan-600 hover:bg-cyan-700" 
                onClick={() => navigate("/producao/apontamentos")}
              >
                <Package className="h-8 w-8" />
                <span>Apontar Produção</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-24 flex flex-col gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                onClick={() => navigate("/producao/expandida")}
              >
                <AlertTriangle className="h-8 w-8" />
                <span>Reportar Problema</span>
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
