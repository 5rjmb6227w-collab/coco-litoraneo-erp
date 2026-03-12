import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Edit, Trash2, Plus, Calendar, DollarSign, Users,
  FileText, Clock, CheckCircle2, Target, Layers, ListTodo, Receipt,
  History, UserPlus, Loader2
} from "lucide-react";
import TaskSidebar from "@/components/TaskSidebar";
import EditProjectModal from "@/components/EditProjectModal";
import { toast } from "sonner";

// Helpers
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtCurrency = (v: any) => {
  const n = parseFloat(String(v || "0"));
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
};
const isOverdue = (d: any, status: string) => {
  if (!d || status === "concluido" || status === "cancelado" || status === "concluida" || status === "cancelada") return false;
  return new Date(d) < new Date();
};

const statusLabels: Record<string, string> = {
  planejamento: "Planejamento", em_andamento: "Em Andamento", pausado: "Pausado",
  concluido: "Concluído", cancelado: "Cancelado",
};
const statusColors: Record<string, string> = {
  planejamento: "bg-slate-100 text-slate-800", em_andamento: "bg-blue-100 text-blue-800",
  pausado: "bg-amber-100 text-amber-800", concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};
const priorityLabels: Record<string, string> = {
  critica: "Crítica", alta: "Alta", media: "Média", baixa: "Baixa",
};
const priorityColors: Record<string, string> = {
  critica: "bg-red-100 text-red-800", alta: "bg-orange-100 text-orange-800",
  media: "bg-blue-100 text-blue-800", baixa: "bg-gray-100 text-gray-800",
};
const taskStatusLabels: Record<string, string> = {
  a_fazer: "A Fazer", em_andamento: "Em Andamento", aguardando: "Aguardando",
  concluida: "Concluída", cancelada: "Cancelada",
};
const taskStatusColors: Record<string, string> = {
  a_fazer: "bg-slate-100 text-slate-800", em_andamento: "bg-blue-100 text-blue-800",
  aguardando: "bg-amber-100 text-amber-800", concluida: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function MeusProjetosDetalhe() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = parseInt(params.id || "0");

  const [activeTab, setActiveTab] = useState("visao-geral");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isNewPhaseOpen, setIsNewPhaseOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [newPhaseForm, setNewPhaseForm] = useState({ title: "", description: "", startDate: "", endDate: "" });
  const [newTaskForm, setNewTaskForm] = useState({ title: "", description: "", priority: "media", estimatedCost: "", phaseId: 0, dueDate: "", assigneeName: "" });

  // Queries
  const projectQuery = trpc.strategic.projects.getById.useQuery({ id: projectId }, { enabled: projectId > 0 });
  const phasesQuery = trpc.strategic.phases.list.useQuery({ projectId }, { enabled: projectId > 0 });
  const tasksQuery = trpc.strategic.tasks.list.useQuery({ projectId, limit: 200 }, { enabled: projectId > 0 });
  const membersQuery = trpc.strategic.members.list.useQuery({ projectId }, { enabled: projectId > 0 });

  // Mutations
  const updateProjectMutation = trpc.strategic.projects.update.useMutation();
  const deleteProjectMutation = trpc.strategic.projects.delete.useMutation();
  const createPhaseMutation = trpc.strategic.phases.create.useMutation();
  const createTaskMutation = trpc.strategic.tasks.create.useMutation();
  const updateTaskMutation = trpc.strategic.tasks.update.useMutation();
  const utils = trpc.useUtils();

  const project = projectQuery.data;
  const phases = phasesQuery.data || [];
  const tasks = (tasksQuery.data as any)?.data || tasksQuery.data || [];
  const members = membersQuery.data || [];

  if (!project && projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }
  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Projeto não encontrado</p>
        <Button variant="outline" onClick={() => navigate("/projetos")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />Voltar
        </Button>
      </div>
    );
  }

  const budgetPlanned = parseFloat(String(project.budgetPlanned || "0"));
  const budgetActual = parseFloat(String(project.budgetActual || "0"));
  const budgetPercent = budgetPlanned > 0 ? Math.min(100, (budgetActual / budgetPlanned) * 100) : 0;

  // Handlers
  const handleDeleteProject = async () => {
    try {
      await deleteProjectMutation.mutateAsync({ id: projectId });
      toast.success("Projeto excluído");
      navigate("/projetos");
    } catch (e) {
      toast.error("Erro ao excluir projeto");
    }
  };

  const handleCreatePhase = async () => {
    if (!newPhaseForm.title.trim()) return;
    try {
      await createPhaseMutation.mutateAsync({
        projectId,
        title: newPhaseForm.title,
        description: newPhaseForm.description || undefined,
        orderIndex: phases.length,
        startDate: newPhaseForm.startDate || undefined,
        endDate: newPhaseForm.endDate || undefined,
      });
      setIsNewPhaseOpen(false);
      setNewPhaseForm({ title: "", description: "", startDate: "", endDate: "" });
      utils.strategic.phases.list.invalidate({ projectId });
      toast.success("Fase criada com sucesso");
    } catch (e) {
      toast.error("Erro ao criar fase");
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskForm.title.trim()) return;
    try {
      await createTaskMutation.mutateAsync({
        projectId,
        phaseId: newTaskForm.phaseId || undefined,
        title: newTaskForm.title,
        description: newTaskForm.description || undefined,
        priority: newTaskForm.priority as any,
        estimatedCost: newTaskForm.estimatedCost || undefined,
        dueDate: newTaskForm.dueDate || undefined,
        assigneeName: newTaskForm.assigneeName || undefined,
      });
      setIsNewTaskOpen(false);
      setNewTaskForm({ title: "", description: "", priority: "media", estimatedCost: "", phaseId: 0, dueDate: "", assigneeName: "" });
      utils.strategic.tasks.list.invalidate({ projectId });
      utils.strategic.projects.getById.invalidate({ id: projectId });
      toast.success("Tarefa criada com sucesso");
    } catch (e) {
      toast.error("Erro ao criar tarefa");
    }
  };

  const handleToggleTaskStatus = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "concluida" ? "a_fazer" : "concluida";
    try {
      await updateTaskMutation.mutateAsync({ id: taskId, status: newStatus as any });
      utils.strategic.tasks.list.invalidate({ projectId });
      utils.strategic.projects.getById.invalidate({ id: projectId });
    } catch (e) {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleSaveProject = async (data: any) => {
    try {
      await updateProjectMutation.mutateAsync(data);
      utils.strategic.projects.getById.invalidate({ id: projectId });
      toast.success("Projeto atualizado");
    } catch (e) {
      toast.error("Erro ao atualizar projeto");
    }
  };

  const tasksList = Array.isArray(tasks) ? tasks : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projetos")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
              <Badge className={`text-xs ${statusColors[project.status] || "bg-gray-100"}`}>
                {statusLabels[project.status] || project.status}
              </Badge>
              <Badge className={`text-xs ${priorityColors[project.priority] || "bg-gray-100"}`}>
                {priorityLabels[project.priority] || project.priority}
              </Badge>
              {project.category && <Badge variant="secondary" className="text-xs capitalize">{project.category}</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
            {project.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{project.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditProjectOpen(true)}>
            <Edit className="w-4 h-4 mr-1" />Editar
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setIsDeleteConfirmOpen(true)}>
            <Trash2 className="w-4 h-4 mr-1" />Excluir
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm font-bold text-[#8B7355]">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} className="h-3" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{tasksList.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{tasksList.filter((t: any) => t.status === "concluida").length}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{tasksList.filter((t: any) => t.status === "em_andamento").length}</p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-600">{tasksList.filter((t: any) => t.status === "a_fazer").length}</p>
              <p className="text-xs text-muted-foreground">A Fazer</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{tasksList.filter((t: any) => t.status === "aguardando").length}</p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="visao-geral" className="text-xs"><Target className="w-3 h-3 mr-1" />Visão Geral</TabsTrigger>
          <TabsTrigger value="fases" className="text-xs"><Layers className="w-3 h-3 mr-1" />Fases</TabsTrigger>
          <TabsTrigger value="tarefas" className="text-xs"><ListTodo className="w-3 h-3 mr-1" />Tarefas</TabsTrigger>
          <TabsTrigger value="orcamento" className="text-xs"><DollarSign className="w-3 h-3 mr-1" />Orçamento</TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs"><FileText className="w-3 h-3 mr-1" />Documentos</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs"><History className="w-3 h-3 mr-1" />Histórico</TabsTrigger>
          <TabsTrigger value="membros" className="text-xs"><Users className="w-3 h-3 mr-1" />Membros</TabsTrigger>
        </TabsList>

        {/* ABA 1: VISÃO GERAL */}
        <TabsContent value="visao-geral">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Informações do Projeto</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Código:</span><p className="font-mono font-medium">{project.code}</p></div>
                  <div><span className="text-muted-foreground">Categoria:</span><p className="font-medium capitalize">{project.category || "—"}</p></div>
                  <div><span className="text-muted-foreground">Início:</span><p className="font-medium">{fmtDate(project.startDate)}</p></div>
                  <div>
                    <span className="text-muted-foreground">Prazo:</span>
                    <p className={`font-medium ${isOverdue(project.targetEndDate, project.status) ? "text-red-600" : ""}`}>
                      {fmtDate(project.targetEndDate)}
                    </p>
                  </div>
                  <div><span className="text-muted-foreground">Fases:</span><p className="font-medium">{phases.length}</p></div>
                  <div><span className="text-muted-foreground">Tarefas:</span><p className="font-medium">{tasksList.length}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Resumo Orçamentário</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Previsto:</span>
                    <p className="font-medium text-lg">R$ {fmtCurrency(budgetPlanned)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Realizado:</span>
                    <p className={`font-medium text-lg ${budgetActual > budgetPlanned && budgetPlanned > 0 ? "text-red-600" : "text-green-600"}`}>
                      R$ {fmtCurrency(budgetActual)}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Utilização</span>
                    <span>{budgetPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${budgetPercent > 100 ? "bg-red-500" : budgetPercent > 80 ? "bg-amber-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(100, budgetPercent)}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Saldo: R$ {fmtCurrency(budgetPlanned - budgetActual)}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 2: FASES */}
        <TabsContent value="fases">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Fases do Projeto</h3>
            <Button size="sm" onClick={() => setIsNewPhaseOpen(true)} className="bg-[#8B7355] hover:bg-[#5D4E37]">
              <Plus className="w-4 h-4 mr-1" />Nova Fase
            </Button>
          </div>
          <div className="space-y-3">
            {phases.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma fase cadastrada. Clique em "Nova Fase" para começar.
                </CardContent>
              </Card>
            ) : phases.map((phase: any, idx: number) => {
              const phaseTasks = tasksList.filter((t: any) => t.phaseId === phase.id);
              const completedTasks = phaseTasks.filter((t: any) => t.status === "concluida").length;
              const phaseProgress = phaseTasks.length > 0 ? Math.round((completedTasks / phaseTasks.length) * 100) : 0;
              return (
                <Card key={phase.id} className="hover:border-[#8B7355]/30 transition">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">Fase {idx + 1}</span>
                          <h4 className="font-medium">{phase.title}</h4>
                          {phase.status === "concluida" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        </div>
                        {phase.description && <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{phaseTasks.length} tarefa(s)</span>
                          <span>{completedTasks} concluída(s)</span>
                          {phase.startDate && <span><Calendar className="w-3 h-3 inline mr-1" />{fmtDate(phase.startDate)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#8B7355]">{phaseProgress}%</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setNewTaskForm({ ...newTaskForm, phaseId: phase.id });
                          setIsNewTaskOpen(true);
                        }}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={phaseProgress} className="h-2 mt-3" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ABA 3: TAREFAS */}
        <TabsContent value="tarefas">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Todas as Tarefas ({tasksList.length})</h3>
            <Button size="sm" onClick={() => {
              if (phases.length > 0) setNewTaskForm({ ...newTaskForm, phaseId: phases[0].id });
              setIsNewTaskOpen(true);
            }} className="bg-[#8B7355] hover:bg-[#5D4E37]">
              <Plus className="w-4 h-4 mr-1" />Nova Tarefa
            </Button>
          </div>
          <div className="space-y-2">
            {tasksList.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma tarefa cadastrada. Adicione tarefas ao projeto.
                </CardContent>
              </Card>
            ) : tasksList.map((task: any) => (
              <Card key={task.id} className="hover:border-[#8B7355]/30 transition cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleTaskStatus(task.id, task.status); }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                          task.status === "concluida"
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-[#8B7355]"
                        }`}
                      >
                        {task.status === "concluida" && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${task.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">{task.code}</span>
                          <Badge className={`text-[10px] ${taskStatusColors[task.status] || "bg-gray-100"}`}>
                            {taskStatusLabels[task.status] || task.status}
                          </Badge>
                          <Badge className={`text-[10px] ${priorityColors[task.priority] || "bg-gray-100"}`}>
                            {priorityLabels[task.priority] || task.priority}
                          </Badge>
                          {task.assigneeName && (
                            <span className="text-[10px] text-muted-foreground">{task.assigneeName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      {parseFloat(String(task.estimatedCost || "0")) > 0 && (
                        <span>R$ {fmtCurrency(task.estimatedCost)}</span>
                      )}
                      {task.dueDate && (
                        <span className={isOverdue(task.dueDate, task.status) ? "text-red-600 font-medium" : ""}>
                          <Calendar className="w-3 h-3 inline mr-1" />{fmtDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ABA 4: ORÇAMENTO */}
        <TabsContent value="orcamento">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 text-center">
                <DollarSign className="w-8 h-8 mx-auto text-[#8B7355] mb-2" />
                <p className="text-2xl font-bold">R$ {fmtCurrency(budgetPlanned)}</p>
                <p className="text-xs text-muted-foreground">Orçamento Previsto</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Receipt className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                <p className={`text-2xl font-bold ${budgetActual > budgetPlanned && budgetPlanned > 0 ? "text-red-600" : "text-green-600"}`}>
                  R$ {fmtCurrency(budgetActual)}
                </p>
                <p className="text-xs text-muted-foreground">Realizado</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Target className="w-8 h-8 mx-auto text-green-600 mb-2" />
                <p className={`text-2xl font-bold ${budgetPlanned - budgetActual < 0 ? "text-red-600" : "text-green-600"}`}>
                  R$ {fmtCurrency(budgetPlanned - budgetActual)}
                </p>
                <p className="text-xs text-muted-foreground">Saldo</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Detalhamento por Tarefa</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tarefa</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Previsto</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Realizado</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tasksList.filter((t: any) => parseFloat(String(t.estimatedCost || "0")) > 0 || parseFloat(String(t.actualCost || "0")) > 0).map((task: any) => {
                      const est = parseFloat(String(task.estimatedCost || "0"));
                      const act = parseFloat(String(task.actualCost || "0"));
                      const diff = est - act;
                      return (
                        <tr key={task.id} className="hover:bg-accent/50">
                          <td className="px-3 py-2">
                            <p className="font-medium">{task.title}</p>
                            <span className="text-xs text-muted-foreground">{task.code}</span>
                          </td>
                          <td className="px-3 py-2 text-right">R$ {fmtCurrency(est)}</td>
                          <td className="px-3 py-2 text-right">R$ {fmtCurrency(act)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${diff < 0 ? "text-red-600" : "text-green-600"}`}>
                            R$ {fmtCurrency(diff)}
                          </td>
                        </tr>
                      );
                    })}
                    {tasksList.filter((t: any) => parseFloat(String(t.estimatedCost || "0")) > 0 || parseFloat(String(t.actualCost || "0")) > 0).length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Nenhuma tarefa com orçamento definido</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 5: DOCUMENTOS */}
        <TabsContent value="documentos">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Documentos do Projeto</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Funcionalidade em desenvolvimento. Em breve você poderá anexar documentos, fotos, PDFs e outros arquivos ao projeto.
              </p>
              <Badge variant="secondary">Em breve</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 6: HISTÓRICO */}
        <TabsContent value="historico">
          <Card>
            <CardHeader><CardTitle className="text-base">Diário de Bordo</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-accent/30 rounded-lg">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm">Projeto criado</p>
                    <span className="text-xs text-muted-foreground">
                      {project.createdAt ? new Date(project.createdAt).toLocaleString("pt-BR") : "—"}
                    </span>
                  </div>
                </div>
                {project.status === "em_andamento" && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Target className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm">Projeto em andamento</p>
                      <span className="text-xs text-muted-foreground">Progresso atual: {project.progress || 0}%</span>
                    </div>
                  </div>
                )}
                {project.status === "concluido" && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm">Projeto concluído</p>
                      <span className="text-xs text-muted-foreground">
                        {project.actualEndDate ? fmtDate(project.actualEndDate) : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 7: MEMBROS */}
        <TabsContent value="membros">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Equipe do Projeto</h3>
            <Button size="sm" variant="outline" onClick={() => toast.info("Funcionalidade em breve")}>
              <UserPlus className="w-4 h-4 mr-1" />Adicionar Membro
            </Button>
          </div>
          <div className="space-y-2">
            {members.length > 0 ? members.map((member: any) => (
              <Card key={member.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#8B7355] text-white flex items-center justify-center text-sm font-medium">
                        U
                      </div>
                      <div>
                        <p className="text-sm font-medium">Usuário #{member.userId}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role || "membro"}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{member.role || "membro"}</Badge>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>Nenhum membro adicionado além do proprietário.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Sidebar */}
      {selectedTaskId && (
        <TaskSidebar
          taskId={selectedTaskId}
          projectId={projectId}
          isOpen={true}
          onClose={() => {
            setSelectedTaskId(null);
            utils.strategic.tasks.list.invalidate({ projectId });
            utils.strategic.projects.getById.invalidate({ id: projectId });
          }}
        />
      )}

      {/* Edit Project Modal */}
      <EditProjectModal
        project={project}
        open={isEditProjectOpen}
        onOpenChange={setIsEditProjectOpen}
        onSave={handleSaveProject}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o projeto <strong>{project.title}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleteProjectMutation.isPending}>
              {deleteProjectMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Phase Modal */}
      <Dialog open={isNewPhaseOpen} onOpenChange={setIsNewPhaseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Fase</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Fase de Planejamento"
                value={newPhaseForm.title}
                onChange={e => setNewPhaseForm({ ...newPhaseForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição da fase..."
                value={newPhaseForm.description}
                onChange={e => setNewPhaseForm({ ...newPhaseForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={newPhaseForm.startDate}
                  onChange={e => setNewPhaseForm({ ...newPhaseForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={newPhaseForm.endDate}
                  onChange={e => setNewPhaseForm({ ...newPhaseForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewPhaseOpen(false)}>Cancelar</Button>
            <Button
              className="bg-[#8B7355] hover:bg-[#5D4E37]"
              disabled={!newPhaseForm.title.trim() || createPhaseMutation.isPending}
              onClick={handleCreatePhase}
            >
              {createPhaseMutation.isPending ? "Criando..." : "Criar Fase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Task Modal */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {phases.length > 0 && (
              <div>
                <Label>Fase</Label>
                <Select
                  value={newTaskForm.phaseId ? newTaskForm.phaseId.toString() : ""}
                  onValueChange={v => setNewTaskForm({ ...newTaskForm, phaseId: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione a fase (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {phases.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Comprar materiais"
                value={newTaskForm.title}
                onChange={e => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição..."
                value={newTaskForm.description}
                onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <Select value={newTaskForm.priority} onValueChange={v => setNewTaskForm({ ...newTaskForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Custo Estimado (R$)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newTaskForm.estimatedCost}
                  onChange={e => setNewTaskForm({ ...newTaskForm, estimatedCost: e.target.value })}
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={newTaskForm.dueDate}
                  onChange={e => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <Input
                  placeholder="Nome"
                  value={newTaskForm.assigneeName}
                  onChange={e => setNewTaskForm({ ...newTaskForm, assigneeName: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTaskOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending || !newTaskForm.title.trim()}
              className="bg-[#8B7355] hover:bg-[#5D4E37]"
            >
              {createTaskMutation.isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
