import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Target,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

const statusLabels: Record<string, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  planejamento: 'bg-blue-500',
  em_andamento: 'bg-amber-500',
  pausado: 'bg-gray-400',
  concluido: 'bg-emerald-500',
  cancelado: 'bg-red-500',
};

const priorityLabels: Record<string, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const categoryLabels: Record<string, string> = {
  equipamento: 'Equipamento',
  obra: 'Obra',
  insumo: 'Insumo',
  processo: 'Processo',
  comercial: 'Comercial',
  outro: 'Outro',
};

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return 'R$ 0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num);
}

function getHealthScore(project: any): { score: number; label: string; color: string } {
  let score = 100;
  
  // Penalizar por atraso
  if (project.targetEndDate) {
    const target = new Date(project.targetEndDate);
    const now = new Date();
    if (now > target && project.status !== 'concluido') {
      score -= 30;
    }
  }
  
  // Penalizar por orçamento estourado
  const planned = parseFloat(project.budgetPlanned || '0');
  const actual = parseFloat(project.budgetActual || '0');
  if (planned > 0 && actual > planned) {
    const overrun = ((actual - planned) / planned) * 100;
    score -= Math.min(30, overrun);
  }
  
  // Penalizar por baixo progresso relativo ao tempo
  if (project.startDate && project.targetEndDate) {
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.targetEndDate).getTime();
    const now = Date.now();
    const totalDuration = end - start;
    if (totalDuration > 0) {
      const elapsed = (now - start) / totalDuration;
      const expectedProgress = Math.min(100, elapsed * 100);
      if (project.progress < expectedProgress - 20) {
        score -= 20;
      }
    }
  }
  
  // Penalizar por status pausado
  if (project.status === 'pausado') score -= 15;
  
  score = Math.max(0, Math.min(100, score));
  
  if (score >= 80) return { score, label: 'Saudável', color: 'text-emerald-500' };
  if (score >= 50) return { score, label: 'Atenção', color: 'text-amber-500' };
  return { score, label: 'Crítico', color: 'text-red-500' };
}

export default function MeusProjetosPortfolio() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'ceo';
  
  const { data: projectsData, isLoading } = trpc.strategic.projects.list.useQuery(
    { limit: 100 }
  );

  const projects = useMemo(() => {
    if (!projectsData) return [];
    return (projectsData as any).data || projectsData || [];
  }, [projectsData]);

  const activeProjects = useMemo(() => {
    return projects.filter((p: any) => p.status !== 'cancelado');
  }, [projects]);

  // Métricas do portfólio
  const metrics = useMemo(() => {
    if (!activeProjects.length) return null;
    
    const totalBudgetPlanned = activeProjects.reduce((sum: number, p: any) => sum + parseFloat(p.budgetPlanned || '0'), 0);
    const totalBudgetActual = activeProjects.reduce((sum: number, p: any) => sum + parseFloat(p.budgetActual || '0'), 0);
    const avgProgress = activeProjects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / activeProjects.length;
    
    const byStatus: Record<string, number> = {};
    activeProjects.forEach((p: any) => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    });
    
    const byCategory: Record<string, number> = {};
    activeProjects.forEach((p: any) => {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    });
    
    const overdue = activeProjects.filter((p: any) => {
      if (!p.targetEndDate || p.status === 'concluido') return false;
      return new Date(p.targetEndDate) < new Date();
    }).length;
    
    const overBudget = activeProjects.filter((p: any) => {
      const planned = parseFloat(p.budgetPlanned || '0');
      const actual = parseFloat(p.budgetActual || '0');
      return planned > 0 && actual > planned;
    }).length;
    
    const healthScores = activeProjects.map((p: any) => getHealthScore(p));
    const avgHealth = healthScores.reduce((sum: number, h: any) => sum + h.score, 0) / healthScores.length;
    
    return {
      total: activeProjects.length,
      totalBudgetPlanned,
      totalBudgetActual,
      avgProgress: Math.round(avgProgress),
      byStatus,
      byCategory,
      overdue,
      overBudget,
      avgHealth: Math.round(avgHealth),
      completed: byStatus['concluido'] || 0,
    };
  }, [activeProjects]);

  // Ordenar projetos por saúde (piores primeiro)
  const sortedProjects = useMemo(() => {
    return [...activeProjects].sort((a: any, b: any) => {
      const healthA = getHealthScore(a).score;
      const healthB = getHealthScore(b).score;
      return healthA - healthB;
    });
  }, [activeProjects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Portfólio de Projetos</h1>
        <div className="text-center py-16 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum projeto encontrado</p>
          <p className="text-sm mt-2">Crie projetos para visualizar o portfólio comparativo</p>
          <Button className="mt-4 bg-[#8B7355] hover:bg-[#5D4E37]" onClick={() => navigate('/projetos')}>
            Ver Projetos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Portfólio de Projetos</h1>
          {isGlobalAdmin && (
            <Badge className="bg-amber-100 text-amber-800 text-xs">Visão Global</Badge>
          )}
        </div>
          <p className="text-muted-foreground mt-1">Visão consolidada e comparativa de todos os projetos estratégicos</p>
        </div>
      </div>

      {/* KPIs do Portfólio */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-[#8B7355]" />
                <span className="text-xs text-muted-foreground">Total Projetos</span>
              </div>
              <p className="text-2xl font-bold">{metrics.total}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Progresso Médio</span>
              </div>
              <p className="text-2xl font-bold">{metrics.avgProgress}%</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Orçamento Total</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(metrics.totalBudgetPlanned)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Gasto Real</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(metrics.totalBudgetActual)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Atrasados</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{metrics.overdue}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Saúde Média</span>
              </div>
              <p className={`text-2xl font-bold ${metrics.avgHealth >= 80 ? 'text-emerald-500' : metrics.avgHealth >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {metrics.avgHealth}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribuição por Status e Categoria */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-400'}`} />
                    <span className="text-sm flex-1">{statusLabels[status] || status}</span>
                    <span className="text-sm font-semibold">{count as number}</span>
                    <div className="w-24">
                      <Progress value={((count as number) / metrics.total) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.byCategory).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#8B7355]" />
                    <span className="text-sm flex-1">{categoryLabels[cat] || cat}</span>
                    <span className="text-sm font-semibold">{count as number}</span>
                    <div className="w-24">
                      <Progress value={((count as number) / metrics.total) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orçamento Comparativo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comparativo de Orçamento — Planejado vs. Real</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedProjects.map((project: any) => {
              const planned = parseFloat(project.budgetPlanned || '0');
              const actual = parseFloat(project.budgetActual || '0');
              const maxBudget = Math.max(planned, actual, 1);
              const isOverBudget = actual > planned && planned > 0;
              
              return (
                <div key={project.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <button
                      className="text-sm font-medium hover:text-[#8B7355] transition-colors text-left truncate max-w-[60%]"
                      onClick={() => navigate(`/projetos/${project.id}`)}
                    >
                      {project.title}
                    </button>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">Plan: {formatCurrency(planned)}</span>
                      <span className={isOverBudget ? 'text-red-500 font-semibold' : 'text-emerald-600'}>
                        Real: {formatCurrency(actual)}
                      </span>
                      {isOverBudget && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          +{Math.round(((actual - planned) / planned) * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="relative h-5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-400/60 rounded-full"
                      style={{ width: `${(planned / maxBudget) * 100}%` }}
                    />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${isOverBudget ? 'bg-red-500/70' : 'bg-emerald-500/70'}`}
                      style={{ width: `${(actual / maxBudget) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-400/60" />
              Planejado
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/70" />
              Real (dentro do orçamento)
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/70" />
              Real (estourado)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Comparativa de Projetos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comparativo Detalhado de Projetos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Projeto</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Prioridade</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Progresso</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Prazo</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Orçamento</th>
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Saúde</th>
                  <th className="pb-3 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project: any) => {
                  const health = getHealthScore(project);
                  const planned = parseFloat(project.budgetPlanned || '0');
                  const actual = parseFloat(project.budgetActual || '0');
                  const isOverBudget = actual > planned && planned > 0;
                  const isOverdue = project.targetEndDate && new Date(project.targetEndDate) < new Date() && project.status !== 'concluido';
                  
                  return (
                    <tr key={project.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{project.title}</p>
                          <p className="text-xs text-muted-foreground">{project.code} • {categoryLabels[project.category]}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full mr-1.5 ${statusColors[project.status]}`} />
                          {statusLabels[project.status]}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs">{priorityLabels[project.priority]}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Progress value={project.progress || 0} className="h-2 w-16" />
                          <span className="text-xs font-medium">{project.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          {isOverdue && <Clock className="h-3.5 w-3.5 text-red-500" />}
                          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                            {project.targetEndDate
                              ? new Date(project.targetEndDate).toLocaleDateString('pt-BR')
                              : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          {isOverBudget ? (
                            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                          ) : actual > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                          ) : null}
                          <span className={`text-xs ${isOverBudget ? 'text-red-500 font-medium' : ''}`}>
                            {formatCurrency(actual)} / {formatCurrency(planned)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${health.score >= 80 ? 'bg-emerald-500' : health.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <span className={`text-xs font-medium ${health.color}`}>{health.score}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`/projetos/${project.id}`)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mapa de Risco vs. Progresso */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Mapa de Risco vs. Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-[320px] border rounded-lg bg-muted/20 overflow-hidden">
            {/* Grid labels */}
            <div className="absolute left-2 top-2 text-[10px] text-muted-foreground font-medium">Alto Risco</div>
            <div className="absolute left-2 bottom-2 text-[10px] text-muted-foreground font-medium">Baixo Risco</div>
            <div className="absolute right-2 bottom-2 text-[10px] text-muted-foreground font-medium">100% Progresso</div>
            <div className="absolute left-12 bottom-2 text-[10px] text-muted-foreground font-medium">0%</div>
            
            {/* Grid lines */}
            <div className="absolute inset-0">
              <div className="absolute left-1/4 top-0 bottom-0 border-l border-dashed border-muted-foreground/10" />
              <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-muted-foreground/10" />
              <div className="absolute left-3/4 top-0 bottom-0 border-l border-dashed border-muted-foreground/10" />
              <div className="absolute top-1/4 left-0 right-0 border-t border-dashed border-muted-foreground/10" />
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-muted-foreground/10" />
              <div className="absolute top-3/4 left-0 right-0 border-t border-dashed border-muted-foreground/10" />
            </div>
            
            {/* Quadrants */}
            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-red-500/5" />
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-amber-500/5" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-amber-500/5" />
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-emerald-500/5" />
            
            {/* Project dots */}
            {sortedProjects.map((project: any) => {
              const health = getHealthScore(project);
              const riskLevel = 100 - health.score; // Inverted: higher risk = higher position
              const progress = project.progress || 0;
              
              // Calculate position (with padding)
              const left = 10 + (progress / 100) * 80; // 10% to 90% horizontal
              const top = 10 + (riskLevel / 100) * 80; // 10% to 90% vertical
              
              const dotColor = health.score >= 80 ? 'bg-emerald-500' : health.score >= 50 ? 'bg-amber-500' : 'bg-red-500';
              const budgetSize = Math.max(20, Math.min(44, parseFloat(project.budgetPlanned || '0') / 5000));
              
              return (
                <button
                  key={project.id}
                  className={`absolute ${dotColor} rounded-full border-2 border-white shadow-md hover:scale-125 transition-transform cursor-pointer group z-10`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${budgetSize}px`,
                    height: `${budgetSize}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => navigate(`/projetos/${project.id}`)}
                  title={`${project.title} — Progresso: ${progress}% | Saúde: ${health.score}%`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-lg whitespace-nowrap border z-20">
                    <p className="font-semibold">{project.title}</p>
                    <p>Progresso: {progress}% | Saúde: {health.score}%</p>
                    <p>{formatCurrency(project.budgetActual)} / {formatCurrency(project.budgetPlanned)}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <span>Tamanho do ponto = Orçamento planejado</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" /> Saudável
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500" /> Atenção
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" /> Crítico
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
