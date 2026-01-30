import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { 
  Bell, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Filter,
  Eye,
  Check,
  X,
  RefreshCw,
  Package,
  DollarSign,
  Factory,
  ShoppingCart,
  Calendar,
  Wrench,
  Settings
} from "lucide-react";

export default function Alertas() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  
  const { data: alerts, isLoading, refetch } = trpc.alerts.list.useQuery({
    category: categoryFilter === "all" ? undefined : categoryFilter || undefined,
    status: statusFilter === "all" ? undefined : statusFilter || undefined,
  });
  
  const { data: stats } = trpc.alerts.getStats.useQuery();
  
  const markAsReadMutation = trpc.alerts.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  
  const resolveMutation = trpc.alerts.resolve.useMutation({
    onSuccess: () => {
      toast.success("Alerta resolvido com sucesso!");
      setIsResolveOpen(false);
      setSelectedAlert(null);
      setResolution("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const ignoreMutation = trpc.alerts.ignore.useMutation({
    onSuccess: () => {
      toast.success("Alerta ignorado");
      refetch();
    },
  });
  
  const generateMutation = trpc.alerts.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} novos alertas foram criados`);
      refetch();
    },
  });
  
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      estoque: Package,
      producao: Factory,
      qualidade: CheckCircle,
      financeiro: DollarSign,
      vencimento: Calendar,
      compras: ShoppingCart,
      manutencao: Wrench,
      sistema: Settings,
    };
    return icons[category] || Bell;
  };
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      estoque: "text-blue-400 bg-blue-400/10",
      producao: "text-yellow-400 bg-yellow-400/10",
      qualidade: "text-green-400 bg-green-400/10",
      financeiro: "text-emerald-400 bg-emerald-400/10",
      vencimento: "text-orange-400 bg-orange-400/10",
      compras: "text-purple-400 bg-purple-400/10",
      manutencao: "text-red-400 bg-red-400/10",
      sistema: "text-slate-400 bg-slate-400/10",
    };
    return colors[category] || "text-slate-400 bg-slate-400/10";
  };
  
  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      baixa: { label: "Baixa", className: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
      media: { label: "Média", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      alta: { label: "Alta", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
      critica: { label: "Crítica", className: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" },
    };
    const c = config[priority] || config.media;
    return <Badge className={`${c.className} border`}>{c.label}</Badge>;
  };
  
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      novo: { label: "Novo", variant: "default" },
      visualizado: { label: "Visualizado", variant: "secondary" },
      em_tratamento: { label: "Em Tratamento", variant: "outline" },
      resolvido: { label: "Resolvido", variant: "secondary" },
      ignorado: { label: "Ignorado", variant: "destructive" },
    };
    const c = config[status] || { label: status, variant: "outline" as const };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };
  
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const alertDate = new Date(date);
    const diffMs = now.getTime() - alertDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays < 7) return `Há ${diffDays}d`;
    return alertDate.toLocaleDateString('pt-BR');
  };
  
  const handleAlertClick = (alert: any) => {
    if (alert.status === 'novo') {
      markAsReadMutation.mutate({ id: alert.id });
    }
    if (alert.actionUrl) {
      setLocation(alert.actionUrl);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central de Alertas</h1>
            <p className="text-muted-foreground">
              Monitore e gerencie todos os alertas do sistema
            </p>
          </div>
          <Button 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            {generateMutation.isPending ? "Gerando..." : "Gerar Alertas"}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total</CardTitle>
              <Bell className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-300">Não Lidos</CardTitle>
              <Eye className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats?.naoLidos || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-300">Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats?.criticos || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Resolvidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats?.resolvidos || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar alertas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="estoque">Estoque</SelectItem>
              <SelectItem value="producao">Produção</SelectItem>
              <SelectItem value="qualidade">Qualidade</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="vencimento">Vencimento</SelectItem>
              <SelectItem value="compras">Compras</SelectItem>
              <SelectItem value="manutencao">Manutenção</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="novo">Novos</SelectItem>
              <SelectItem value="visualizado">Visualizados</SelectItem>
              <SelectItem value="em_tratamento">Em Tratamento</SelectItem>
              <SelectItem value="resolvido">Resolvidos</SelectItem>
              <SelectItem value="ignorado">Ignorados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alerts List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-slate-700 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-slate-700 rounded w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts
              .filter((alert: any) => 
                !search || 
                alert.title.toLowerCase().includes(search.toLowerCase()) ||
                alert.description.toLowerCase().includes(search.toLowerCase())
              )
              .map((alert: any) => {
                const CategoryIcon = getCategoryIcon(alert.category);
                const categoryColor = getCategoryColor(alert.category);
                
                return (
                  <Card 
                    key={alert.id} 
                    className={`transition-all hover:shadow-lg cursor-pointer ${
                      alert.status === 'novo' ? 'border-cyan-500/50 bg-cyan-900/5' :
                      alert.priority === 'critica' ? 'border-red-500/30' :
                      'border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${categoryColor}`}>
                          <CategoryIcon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className={`font-medium ${alert.status === 'novo' ? 'text-white' : 'text-slate-300'}`}>
                              {alert.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getPriorityBadge(alert.priority)}
                              {getStatusBadge(alert.status)}
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {alert.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {getTimeAgo(alert.createdAt)}
                              {alert.entityName && (
                                <>
                                  <span>•</span>
                                  <span>{alert.entityName}</span>
                                </>
                              )}
                            </div>
                            
                            {alert.status !== 'resolvido' && alert.status !== 'ignorado' && (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setIsResolveOpen(true);
                                  }}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Resolver
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-slate-400 hover:text-slate-300"
                                  onClick={() => ignoreMutation.mutate({ id: alert.id })}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Ignorar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum alerta encontrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search || categoryFilter || statusFilter
                  ? "Tente ajustar os filtros de busca"
                  : "Clique em 'Gerar Alertas' para verificar o sistema"}
              </p>
              {!search && !categoryFilter && !statusFilter && (
                <Button onClick={() => generateMutation.mutate()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Gerar Alertas
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resolve Dialog */}
        <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolver Alerta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {selectedAlert?.title}
              </p>
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolução</Label>
                <Textarea
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Descreva como o problema foi resolvido..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResolveOpen(false)}>
                Cancelar
              </Button>
              <Button 
                disabled={!resolution || resolveMutation.isPending}
                onClick={() => {
                  if (selectedAlert) {
                    resolveMutation.mutate({
                      id: selectedAlert.id,
                      resolution,
                    });
                  }
                }}
              >
                {resolveMutation.isPending ? "Salvando..." : "Confirmar Resolução"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
