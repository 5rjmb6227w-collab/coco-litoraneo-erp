import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Plus, 
  Building2,
  Wrench,
  Monitor,
  Truck,
  Factory,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Calculator,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Send
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
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";

const CAPEX_CATEGORIES = [
  { id: "equipamentos", name: "Equipamentos", icon: Factory, color: "#3B82F6" },
  { id: "infraestrutura", name: "Infraestrutura", icon: Building2, color: "#10B981" },
  { id: "tecnologia", name: "Tecnologia", icon: Monitor, color: "#8B5CF6" },
  { id: "veiculos", name: "Veículos", icon: Truck, color: "#F97316" },
  { id: "manutencao_maior", name: "Manutenção Maior", icon: Wrench, color: "#EF4444" },
];

const PROJECT_STATUS = [
  { id: "planejado", name: "Planejado", color: "bg-gray-500" },
  { id: "aprovado", name: "Aprovado", color: "bg-blue-500" },
  { id: "em_andamento", name: "Em Andamento", color: "bg-yellow-500" },
  { id: "concluido", name: "Concluído", color: "bg-green-500" },
  { id: "cancelado", name: "Cancelado", color: "bg-red-500" },
];

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface CapexProject {
  id: number;
  name: string;
  category: string;
  description: string;
  totalValue: number;
  status: string;
  startDate: string;
  endDate: string;
  paybackMonths: number;
  roi: number;
  justification: string;
  disbursements: number[];
  isBaseZero: boolean;
}

export default function OrcamentoCAPEX() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("projetos");
  const [isBaseZeroMode, setIsBaseZeroMode] = useState(false);
  
  // Mock data for CAPEX projects
  const [projects, setProjects] = useState<CapexProject[]>([
    {
      id: 1,
      name: "Nova Linha de Produção",
      category: "equipamentos",
      description: "Instalação de nova linha de envase automático",
      totalValue: 850000,
      status: "aprovado",
      startDate: "2026-03-01",
      endDate: "2026-08-31",
      paybackMonths: 24,
      roi: 35,
      justification: "Aumento de capacidade produtiva em 40%",
      disbursements: [0, 0, 200000, 200000, 150000, 150000, 100000, 50000, 0, 0, 0, 0],
      isBaseZero: false,
    },
    {
      id: 2,
      name: "Sistema ERP Integrado",
      category: "tecnologia",
      description: "Implementação de sistema de gestão integrado",
      totalValue: 180000,
      status: "em_andamento",
      startDate: "2026-01-15",
      endDate: "2026-06-30",
      paybackMonths: 18,
      roi: 45,
      justification: "Redução de custos operacionais e aumento de eficiência",
      disbursements: [30000, 30000, 30000, 30000, 30000, 30000, 0, 0, 0, 0, 0, 0],
      isBaseZero: true,
    },
    {
      id: 3,
      name: "Frota de Caminhões",
      category: "veiculos",
      description: "Aquisição de 3 caminhões para distribuição",
      totalValue: 450000,
      status: "planejado",
      startDate: "2026-06-01",
      endDate: "2026-07-31",
      paybackMonths: 36,
      roi: 22,
      justification: "Internalização da logística de distribuição",
      disbursements: [0, 0, 0, 0, 0, 225000, 225000, 0, 0, 0, 0, 0],
      isBaseZero: false,
    },
  ]);

  const [newProject, setNewProject] = useState({
    name: "",
    category: "equipamentos",
    description: "",
    totalValue: 0,
    startDate: "",
    endDate: "",
    paybackMonths: 0,
    roi: 0,
    justification: "",
    isBaseZero: false,
  });

  // Queries
  const { data: budgets } = trpc.budget.list.useQuery({ year: selectedYear });

  // Calculated metrics
  const metrics = useMemo(() => {
    const totalCapex = projects.reduce((sum, p) => sum + p.totalValue, 0);
    const approvedCapex = projects.filter(p => p.status === "aprovado" || p.status === "em_andamento" || p.status === "concluido")
      .reduce((sum, p) => sum + p.totalValue, 0);
    const pendingCapex = projects.filter(p => p.status === "planejado")
      .reduce((sum, p) => sum + p.totalValue, 0);
    const avgRoi = projects.length > 0 
      ? projects.reduce((sum, p) => sum + p.roi, 0) / projects.length 
      : 0;
    const avgPayback = projects.length > 0 
      ? projects.reduce((sum, p) => sum + p.paybackMonths, 0) / projects.length 
      : 0;
    const baseZeroProjects = projects.filter(p => p.isBaseZero).length;
    
    return { totalCapex, approvedCapex, pendingCapex, avgRoi, avgPayback, baseZeroProjects };
  }, [projects]);

  // Chart data
  const categoryData = useMemo(() => {
    const grouped = CAPEX_CATEGORIES.map(cat => ({
      name: cat.name,
      value: projects.filter(p => p.category === cat.id).reduce((sum, p) => sum + p.totalValue, 0),
      color: cat.color,
    }));
    return grouped.filter(g => g.value > 0);
  }, [projects]);

  const disbursementData = useMemo(() => {
    return MONTHS.map((month, idx) => ({
      month,
      valor: projects.reduce((sum, p) => sum + (p.disbursements[idx] || 0), 0),
    }));
  }, [projects]);

  const handleCreateProject = () => {
    const newId = Math.max(...projects.map(p => p.id), 0) + 1;
    const disbursements = new Array(12).fill(0);
    
    setProjects([...projects, {
      id: newId,
      ...newProject,
      status: "planejado",
      disbursements,
    }]);
    
    toast.success("Projeto CAPEX criado com sucesso!");
    setShowNewProjectDialog(false);
    setNewProject({
      name: "",
      category: "equipamentos",
      description: "",
      totalValue: 0,
      startDate: "",
      endDate: "",
      paybackMonths: 0,
      roi: 0,
      justification: "",
      isBaseZero: false,
    });
  };

  const handleDeleteProject = (id: number) => {
    setProjects(projects.filter(p => p.id !== id));
    toast.success("Projeto removido!");
  };

  const getCategoryInfo = (categoryId: string) => {
    return CAPEX_CATEGORIES.find(c => c.id === categoryId) || CAPEX_CATEGORIES[0];
  };

  const getStatusInfo = (statusId: string) => {
    return PROJECT_STATUS.find(s => s.id === statusId) || PROJECT_STATUS[0];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">CAPEX & Orçamento Base Zero</h1>
            <p className="text-muted-foreground">
              Gestão de investimentos e projetos de capital
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={isBaseZeroMode}
                onCheckedChange={setIsBaseZeroMode}
              />
              <Label>Modo Base Zero</Label>
            </div>
            
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

            <Button onClick={() => setShowNewProjectDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">CAPEX Total</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                R$ {(metrics.totalCapex / 1000).toFixed(0)}k
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Aprovado</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                R$ {(metrics.approvedCapex / 1000).toFixed(0)}k
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Pendente</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                R$ {(metrics.pendingCapex / 1000).toFixed(0)}k
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="text-sm text-muted-foreground">ROI Médio</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {metrics.avgRoi.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-muted-foreground">Payback Médio</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {metrics.avgPayback.toFixed(0)} meses
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-teal-500" />
                <span className="text-sm text-muted-foreground">Base Zero</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {metrics.baseZeroProjects} projetos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="cronograma">Cronograma de Desembolso</TabsTrigger>
            <TabsTrigger value="analise">Análise de Viabilidade</TabsTrigger>
          </TabsList>

          {/* Projetos Tab */}
          <TabsContent value="projetos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Projects List */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Projetos de Investimento</CardTitle>
                  <CardDescription>
                    {isBaseZeroMode ? "Mostrando apenas projetos Base Zero" : "Todos os projetos"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects
                      .filter(p => !isBaseZeroMode || p.isBaseZero)
                      .map((project) => {
                        const category = getCategoryInfo(project.category);
                        const status = getStatusInfo(project.status);
                        const CategoryIcon = category.icon;
                        
                        return (
                          <div key={project.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: `${category.color}20` }}>
                                  <CategoryIcon className="h-5 w-5" style={{ color: category.color }} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{project.name}</h4>
                                    {project.isBaseZero && (
                                      <Badge variant="outline" className="text-xs">OBZ</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{project.description}</p>
                                  <div className="flex items-center gap-4 mt-2 text-sm">
                                    <Badge className={status.color}>{status.name}</Badge>
                                    <span>ROI: {project.roi}%</span>
                                    <span>Payback: {project.paybackMonths} meses</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">
                                  R$ {project.totalValue.toLocaleString('pt-BR')}
                                </p>
                                <div className="flex items-center gap-1 mt-2">
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteProject(project.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {project.justification && (
                              <div className="mt-3 p-2 bg-muted rounded text-sm">
                                <strong>Justificativa:</strong> {project.justification}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cronograma Tab */}
          <TabsContent value="cronograma" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cronograma de Desembolso</CardTitle>
                <CardDescription>Previsão de desembolsos mensais para {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={disbursementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} />
                      <Legend />
                      <Bar dataKey="valor" name="Desembolso" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Disbursement Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Projeto</th>
                        {MONTHS.map(m => (
                          <th key={m} className="text-right p-2">{m}</th>
                        ))}
                        <th className="text-right p-2 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map(project => (
                        <tr key={project.id} className="border-b">
                          <td className="p-2 font-medium">{project.name}</td>
                          {project.disbursements.map((val, idx) => (
                            <td key={idx} className="text-right p-2">
                              {val > 0 ? `${(val/1000).toFixed(0)}k` : "-"}
                            </td>
                          ))}
                          <td className="text-right p-2 font-bold">
                            R$ {project.totalValue.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted font-bold">
                        <td className="p-2">TOTAL</td>
                        {MONTHS.map((_, idx) => (
                          <td key={idx} className="text-right p-2">
                            {(projects.reduce((sum, p) => sum + (p.disbursements[idx] || 0), 0) / 1000).toFixed(0)}k
                          </td>
                        ))}
                        <td className="text-right p-2">
                          R$ {metrics.totalCapex.toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Análise Tab */}
          <TabsContent value="analise" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análise de ROI</CardTitle>
                  <CardDescription>Retorno sobre investimento por projeto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={projects.map(p => ({ name: p.name.substring(0, 15), roi: p.roi }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" unit="%" />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="roi" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Análise de Payback</CardTitle>
                  <CardDescription>Tempo de retorno do investimento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={projects.map(p => ({ name: p.name.substring(0, 15), payback: p.paybackMonths }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" unit=" meses" />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip formatter={(v: number) => `${v} meses`} />
                        <Bar dataKey="payback" fill="#F97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Matriz de Priorização</CardTitle>
                  <CardDescription>Projetos ordenados por ROI e valor de investimento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...projects]
                      .sort((a, b) => b.roi - a.roi)
                      .map((project, idx) => {
                        const category = getCategoryInfo(project.category);
                        const status = getStatusInfo(project.status);
                        
                        return (
                          <div key={project.id} className="flex items-center gap-4 p-4 border rounded-lg">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{project.name}</h4>
                                <Badge className={status.color}>{status.name}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{category.name}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                                <span className="font-bold text-green-600">{project.roi}% ROI</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                R$ {project.totalValue.toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Payback</p>
                              <p className="font-medium">{project.paybackMonths} meses</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* New Project Dialog */}
        <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Projeto de Investimento</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Projeto</Label>
                <Input
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Ex: Nova Linha de Produção"
                />
              </div>
              
              <div>
                <Label>Categoria</Label>
                <Select 
                  value={newProject.category} 
                  onValueChange={(v) => setNewProject({ ...newProject, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPEX_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  value={newProject.totalValue}
                  onChange={(e) => setNewProject({ ...newProject, totalValue: Number(e.target.value) })}
                />
              </div>
              
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={newProject.endDate}
                  onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label>ROI Esperado (%)</Label>
                <Input
                  type="number"
                  value={newProject.roi}
                  onChange={(e) => setNewProject({ ...newProject, roi: Number(e.target.value) })}
                />
              </div>
              
              <div>
                <Label>Payback (meses)</Label>
                <Input
                  type="number"
                  value={newProject.paybackMonths}
                  onChange={(e) => setNewProject({ ...newProject, paybackMonths: Number(e.target.value) })}
                />
              </div>
              
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Descrição breve do projeto"
                />
              </div>
              
              <div className="col-span-2">
                <Label>Justificativa (Obrigatória para OBZ)</Label>
                <Textarea
                  value={newProject.justification}
                  onChange={(e) => setNewProject({ ...newProject, justification: e.target.value })}
                  placeholder="Justifique a necessidade deste investimento..."
                  rows={3}
                />
              </div>
              
              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  checked={newProject.isBaseZero}
                  onCheckedChange={(v) => setNewProject({ ...newProject, isBaseZero: v })}
                />
                <Label>Projeto Base Zero (OBZ) - Requer justificativa detalhada</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProject.name || !newProject.totalValue}>
                Criar Projeto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
