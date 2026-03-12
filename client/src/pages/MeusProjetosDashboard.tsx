import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Briefcase, PlayCircle, AlertTriangle, DollarSign, CheckCircle, ThumbsUp, Plus, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

interface NewProjectForm {
  title: string;
  description: string;
  category: string;
  priority: string;
  startDate: string;
  endDate: string;
  budgetPlanned: string;
}

export default function MeusProjetosDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'ceo';
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<NewProjectForm>({
    title: "",
    description: "",
    category: "equipamento",
    priority: "media",
    startDate: "",
    endDate: "",
    budgetPlanned: "",
  });

  // 7c) Atalhos de teclado - Ctrl+N abre novo projeto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setIsDialogOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const dashboardQuery = trpc.strategic.projects.dashboard.useQuery();
  const todayTasksQuery = trpc.strategic.tasks.todayTasks.useQuery();
  const overdueTasksQuery = trpc.strategic.tasks.overdueTasks.useQuery();
  const projectsListQuery = trpc.strategic.projects.list.useQuery({});
  const createProjectMutation = trpc.strategic.projects.create.useMutation();

  const dashboard = dashboardQuery.data;
  const todayTasks = todayTasksQuery.data || [];
  const overdueTasks = overdueTasksQuery.data || [];
  const rawProjects = (projectsListQuery.data as any)?.data || projectsListQuery.data || [];
  const recentProjects = (Array.isArray(rawProjects) ? rawProjects : []).slice(0, 6);

  const handleCreateProject = async () => {
    if (!formData.title.trim()) return;
    
    try {
      const newProject = await createProjectMutation.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category as any,
        priority: formData.priority as any,
        startDate: formData.startDate || undefined,
        targetEndDate: formData.endDate || undefined,
        budgetPlanned: formData.budgetPlanned || undefined,
      });
      
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        category: "equipamento",
        priority: "media",
        startDate: "",
        endDate: "",
        budgetPlanned: "",
      });
      
      toast.success("Projeto criado com sucesso!");
      await dashboardQuery.refetch();
      navigate(`/projetos/${newProject.id}`);
    } catch (error) {
      toast.error("Erro ao criar projeto");
      console.error("Erro ao criar projeto:", error);
    }
  };

  // Gráfico de Pizza - Status dos Projetos
  const totalProjects = dashboard?.totalProjects || 0;
  const inProgress = dashboard?.inProgress || 0;
  const completed = dashboard?.completed || 0;
  const overdue = dashboard?.overdue || 0;
  const planning = Math.max(0, totalProjects - inProgress - completed - overdue);
  
  const statusChartData = {
    labels: ["Planejamento", "Em Andamento", "Concluído", "Atrasado"],
    datasets: [
      {
        data: [planning, inProgress, completed, overdue],
        backgroundColor: ["#94a3b8", "#3b82f6", "#22c55e", "#ef4444"],
        borderColor: "#fff",
        borderWidth: 2,
      },
    ],
  };

  // Gráfico de Barras - Orçamento
  const budgetChartData = {
    labels: recentProjects.map((p) => p.title.substring(0, 15)),
    datasets: [
      {
        label: "Previsto",
        data: recentProjects.map((p) => parseFloat(p.budgetPlanned || '0')),
        backgroundColor: "#8B7355",
        borderRadius: 4,
      },
      {
        label: "Realizado",
        data: recentProjects.map((p) => parseFloat(p.budgetActual || '0')),
        backgroundColor: "#D4C4B0",
        borderRadius: 4,
      },
    ],
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planejamento: "bg-slate-100 text-slate-800",
      em_andamento: "bg-blue-100 text-blue-800",
      pausado: "bg-amber-100 text-amber-800",
      concluido: "bg-green-100 text-green-800",
      cancelado: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critica: "text-red-600",
      alta: "text-orange-600",
      media: "text-blue-600",
      baixa: "text-gray-600",
    };
    return colors[priority] || "text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Meus Projetos</h1>
            {isGlobalAdmin && (
              <Badge className="bg-amber-100 text-amber-800 text-xs">Visão Global</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isGlobalAdmin ? 'Todos os projetos da organização' : 'Projetos onde você participa'}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#8B7355] hover:bg-[#5D4E37]">
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* 4 Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <Briefcase className="h-4 w-4 text-[#8B7355]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">Projetos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <PlayCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress}</div>
            <p className="text-xs text-muted-foreground">Projetos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdue > 0 ? "text-red-600 animate-pulse" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdue}</div>
            <p className="text-xs text-muted-foreground">Projetos com atraso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamento</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {((dashboard?.totalBudgetPlanned || 0) / 1000).toFixed(0)}k</div>
            <p className="text-xs text-muted-foreground">Previsto total</p>
          </CardContent>
        </Card>
      </div>

      {/* 2 Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projetos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orçamento Previsto vs Realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <Bar
                data={budgetChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { beginAtZero: true } },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Minhas Tarefas de Hoje e Tarefas Atrasadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Minhas Tarefas de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa para hoje</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/projetos/${task.projectId}`)}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer transition"
                  >
                    <input type="checkbox" className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Projeto #{task.projectId}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarefas Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ThumbsUp className="h-12 w-12 text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma tarefa atrasada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overdueTasks.map((task) => {
                  const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : 0;
                  const daysOverdue = Math.max(0, Math.floor((Date.now() - dueTime) / (1000 * 60 * 60 * 24)));
                  return (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/projetos/${task.projectId}`)}
                      className="flex items-center justify-between p-2 rounded hover:bg-accent cursor-pointer transition"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">Projeto #{task.projectId}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs ml-2">
                        {daysOverdue}d atraso
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projetos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projetos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <h4 className="font-medium mb-1">Crie seu primeiro projeto</h4>
              <p className="text-sm text-muted-foreground mb-4">Organize suas iniciativas estratégicas em projetos com fases, tarefas e orçamento.</p>
              <Button onClick={() => setIsDialogOpen(true)} className="bg-[#8B7355] hover:bg-[#5D4E37]">
                <Plus className="w-4 h-4 mr-2" />Novo Projeto
              </Button>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projetos/${project.id}`)}
                className="p-4 border rounded-lg hover:shadow-md cursor-pointer transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm truncate">{project.title}</h3>
                  <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Progresso</span>
                    <span className="font-medium">{project.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#8B7355] h-2 rounded-full transition-all"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-2">
                    <span>Prazo: {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString("pt-BR") : "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Novo Projeto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Forno de Secagem"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição do projeto..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipamento">Equipamento</SelectItem>
                    <SelectItem value="obra">Obra</SelectItem>
                    <SelectItem value="insumo">Insumo</SelectItem>
                    <SelectItem value="processo">Processo</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Data Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Término</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="budgetPlanned">Orçamento Previsto (R$)</Label>
              <Input
                id="budgetPlanned"
                type="number"
                placeholder="0.00"
                value={formData.budgetPlanned}
                onChange={(e) => setFormData({ ...formData, budgetPlanned: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending} className="bg-[#8B7355] hover:bg-[#5D4E37]">
              {createProjectMutation.isPending ? "Criando..." : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
