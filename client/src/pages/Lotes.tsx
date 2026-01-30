import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Filter,
  QrCode,
  History,
  Shield,
  Unlock
} from "lucide-react";

export default function Lotes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuarantineOpen, setIsQuarantineOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [quarantineReason, setQuarantineReason] = useState("");
  
  const { data: batches, isLoading, refetch } = trpc.batches.list.useQuery({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter || undefined,
  });
  
  const { data: stats } = trpc.batches.getStats.useQuery();
  const { data: skus } = trpc.skus.list.useQuery({});
  
  const createMutation = trpc.batches.create.useMutation({
    onSuccess: () => {
      toast.success("Lote criado com sucesso!");
      setIsCreateOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao criar lote: ${error.message}`);
    },
  });
  
  const quarantineMutation = trpc.batches.quarantine.useMutation({
    onSuccess: () => {
      toast.success("Lote colocado em quarentena");
      setIsQuarantineOpen(false);
      setSelectedBatch(null);
      setQuarantineReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const releaseMutation = trpc.batches.release.useMutation({
    onSuccess: () => {
      toast.success("Lote liberado da quarentena");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      em_producao: { label: "Em Produção", variant: "secondary", icon: Clock },
      quarentena: { label: "Quarentena", variant: "destructive", icon: AlertTriangle },
      disponivel: { label: "Disponível", variant: "default", icon: CheckCircle },
      reservado: { label: "Reservado", variant: "outline", icon: Package },
      expedido: { label: "Expedido", variant: "secondary", icon: CheckCircle },
      vencido: { label: "Vencido", variant: "destructive", icon: XCircle },
      descartado: { label: "Descartado", variant: "destructive", icon: XCircle },
    };
    
    const config = statusConfig[status] || { label: status, variant: "outline" as const, icon: Package };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };
  
  const getGradeBadge = (grade?: string) => {
    if (!grade) return null;
    const colors: Record<string, string> = {
      A: "bg-green-500/20 text-green-400 border-green-500/30",
      B: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      C: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return (
      <Badge className={`${colors[grade]} border`}>
        Grau {grade}
      </Badge>
    );
  };
  
  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      code: formData.get("code") as string,
      skuId: Number(formData.get("skuId")),
      quantity: formData.get("quantity") as string,
      productionDate: formData.get("productionDate") as string,
      expirationDate: formData.get("expirationDate") as string,
      qualityGrade: formData.get("qualityGrade") as "A" | "B" | "C" | undefined,
      location: formData.get("location") as string || undefined,
      observations: formData.get("observations") as string || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Lotes</h1>
            <p className="text-muted-foreground">
              Controle de lotes de produção, quarentena e rastreabilidade
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600">
                <Plus className="mr-2 h-4 w-4" />
                Novo Lote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Lote</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código do Lote</Label>
                    <Input id="code" name="code" placeholder="LT-2026-001" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skuId">Produto (SKU)</Label>
                    <Select name="skuId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {skus?.map((sku: any) => (
                          <SelectItem key={sku.id} value={String(sku.id)}>
                            {sku.code} - {sku.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade (kg)</Label>
                    <Input id="quantity" name="quantity" type="number" step="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualityGrade">Grau de Qualidade</Label>
                    <Select name="qualityGrade">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Grau A</SelectItem>
                        <SelectItem value="B">Grau B</SelectItem>
                        <SelectItem value="C">Grau C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productionDate">Data de Produção</Label>
                    <Input id="productionDate" name="productionDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expirationDate">Data de Validade</Label>
                    <Input id="expirationDate" name="expirationDate" type="date" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input id="location" name="location" placeholder="Prateleira A-01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea id="observations" name="observations" rows={2} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Lote"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total</CardTitle>
              <Package className="h-4 w-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Disponíveis</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{stats?.disponivel || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border-yellow-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-300">Em Produção</CardTitle>
              <Clock className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{stats?.emProducao || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border-orange-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-300">Quarentena</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{stats?.quarentena || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-300">Vencendo</CardTitle>
              <Clock className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{stats?.vencendo || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-700/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-300">Vencidos</CardTitle>
              <XCircle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats?.vencidos || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="em_producao">Em Produção</SelectItem>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="quarentena">Quarentena</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="expedido">Expedido</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Batches Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-700 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-slate-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : batches && batches.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {batches.map((item: any) => {
              const daysUntilExpiration = getDaysUntilExpiration(item.batch.expirationDate);
              const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 0;
              const isExpired = daysUntilExpiration <= 0;
              
              return (
                <Card 
                  key={item.batch.id} 
                  className={`transition-all hover:shadow-lg ${
                    isExpired ? 'border-red-500/50 bg-red-900/10' :
                    isExpiringSoon ? 'border-yellow-500/50 bg-yellow-900/10' :
                    item.batch.status === 'quarentena' ? 'border-orange-500/50 bg-orange-900/10' :
                    'border-slate-700 hover:border-cyan-500/50'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-white">{item.batch.code}</h3>
                        <p className="text-sm text-muted-foreground">{item.skuDescription}</p>
                      </div>
                      {getStatusBadge(item.batch.status)}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantidade:</span>
                        <span className="font-medium">{item.batch.quantity} kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Produção:</span>
                        <span>{new Date(item.batch.productionDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Validade:</span>
                        <span className={isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : ''}>
                          {new Date(item.batch.expirationDate).toLocaleDateString('pt-BR')}
                          {isExpiringSoon && !isExpired && ` (${daysUntilExpiration}d)`}
                          {isExpired && ' (Vencido)'}
                        </span>
                      </div>
                      {item.batch.location && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Local:</span>
                          <span>{item.batch.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {getGradeBadge(item.batch.qualityGrade)}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="QR Code">
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Histórico">
                          <History className="h-4 w-4" />
                        </Button>
                        {item.batch.status === 'disponivel' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-orange-400 hover:text-orange-300" 
                            title="Quarentena"
                            onClick={() => {
                              setSelectedBatch(item.batch);
                              setIsQuarantineOpen(true);
                            }}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        {item.batch.status === 'quarentena' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-400 hover:text-green-300" 
                            title="Liberar"
                            onClick={() => releaseMutation.mutate({ id: item.batch.id })}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        )}
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
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum lote encontrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search || statusFilter 
                  ? "Tente ajustar os filtros de busca"
                  : "Comece criando um novo lote de produção"}
              </p>
              {!search && !statusFilter && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Lote
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quarantine Dialog */}
        <Dialog open={isQuarantineOpen} onOpenChange={setIsQuarantineOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Colocar Lote em Quarentena</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Lote: <strong>{selectedBatch?.code}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="quarantineReason">Motivo da Quarentena</Label>
                <Textarea
                  id="quarantineReason"
                  value={quarantineReason}
                  onChange={(e) => setQuarantineReason(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuarantineOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                disabled={!quarantineReason || quarantineMutation.isPending}
                onClick={() => {
                  if (selectedBatch) {
                    quarantineMutation.mutate({
                      id: selectedBatch.id,
                      reason: quarantineReason,
                    });
                  }
                }}
              >
                {quarantineMutation.isPending ? "Processando..." : "Confirmar Quarentena"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
