import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Bell, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Eye,
  XCircle,
  Filter,
  Search,
  MoreHorizontal,
  Settings,
  Percent,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
  novo: { label: "Novo", variant: "destructive", icon: AlertTriangle },
  visualizado: { label: "Visualizado", variant: "secondary", icon: Eye },
  resolvido: { label: "Resolvido", variant: "default", icon: CheckCircle },
  ignorado: { label: "Ignorado", variant: "outline", icon: XCircle },
};

export default function CustoAlertas() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [thresholdValue, setThresholdValue] = useState("10");

  // Queries
  const { data: alerts, isLoading, refetch } = trpc.costs.alerts.list.useQuery({
    status: filterStatus === "all" ? undefined : filterStatus as any,
  });

  const { data: unreadCount } = trpc.costs.alerts.getUnreadCount.useQuery();
  const { data: thresholdSetting } = trpc.costs.settings.get.useQuery({ key: "alert_threshold_percent" });
  const { data: skus } = trpc.skus.list.useQuery({});

  // Mutations
  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.costs.alerts.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status do alerta atualizado!");
      setShowResolveModal(false);
      setSelectedAlert(null);
      setResolution("");
      utils.costs.alerts.list.invalidate();
      utils.costs.alerts.getUnreadCount.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar alerta: ${error.message}`);
    },
  });

  const updateSettingMutation = trpc.costs.settings.set.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      setShowSettingsModal(false);
      utils.costs.settings.get.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    },
  });

  const handleMarkAsViewed = (alert: any) => {
    if (alert.status === "novo") {
      updateStatusMutation.mutate({ id: alert.id, status: "visualizado" });
    }
  };

  const handleOpenResolve = (alert: any) => {
    setSelectedAlert(alert);
    setResolution("");
    setShowResolveModal(true);
  };

  const handleResolve = (status: "resolvido" | "ignorado") => {
    if (!selectedAlert) return;
    updateStatusMutation.mutate({
      id: selectedAlert.id,
      status,
      resolution: resolution || undefined,
    });
  };

  const handleSaveThreshold = () => {
    const value = parseFloat(thresholdValue);
    if (isNaN(value) || value < 0 || value > 100) {
      toast.error("Valor inválido. Use um número entre 0 e 100.");
      return;
    }
    updateSettingMutation.mutate({
      key: "alert_threshold_percent",
      value: value.toString(),
      type: "percent",
      description: "Percentual de variação de custo para gerar alerta",
    });
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (!num && num !== 0) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  const formatPercent = (value: number | string | null | undefined) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (!num && num !== 0) return "0%";
    return `${num.toFixed(2)}%`;
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSkuInfo = (skuId: number) => {
    const sku = skus?.find(s => s.id === skuId);
    return sku ? `${sku.code} - ${sku.description}` : `SKU #${skuId}`;
  };

  // Stats
  const newAlerts = alerts?.filter(a => a.status === "novo").length || 0;
  const viewedAlerts = alerts?.filter(a => a.status === "visualizado").length || 0;
  const resolvedAlerts = alerts?.filter(a => a.status === "resolvido").length || 0;
  const ignoredAlerts = alerts?.filter(a => a.status === "ignorado").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Alertas de Variação de Custos
            {(unreadCount || 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} novos
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitore variações significativas nos custos de produção
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          setThresholdValue(thresholdSetting?.settingValue || "10");
          setShowSettingsModal(true);
        }} className="gap-2">
          <Settings className="h-4 w-4" />
          Configurar Limites
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={newAlerts > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${newAlerts > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              <span className="text-2xl font-bold">{newAlerts}</span>
            </div>
            <p className="text-xs text-muted-foreground">Novos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{viewedAlerts}</span>
            </div>
            <p className="text-xs text-muted-foreground">Visualizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{resolvedAlerts}</span>
            </div>
            <p className="text-xs text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{ignoredAlerts}</span>
            </div>
            <p className="text-xs text-muted-foreground">Ignorados</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Threshold Info */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Percent className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">Limite de Alerta Configurado</p>
                <p className="text-sm text-blue-600">
                  Alertas são gerados quando a variação de custo excede este percentual
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {thresholdSetting?.settingValue || "10"}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="novo">Novos</SelectItem>
                <SelectItem value="visualizado">Visualizados</SelectItem>
                <SelectItem value="resolvido">Resolvidos</SelectItem>
                <SelectItem value="ignorado">Ignorados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alertas</CardTitle>
          <CardDescription>
            {alerts?.length || 0} alerta(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : alerts && alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Custo Anterior</TableHead>
                  <TableHead className="text-right">Custo Atual</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const statusInfo = statusLabels[alert.status] || statusLabels.novo;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <TableRow 
                      key={alert.id}
                      className={alert.status === "novo" ? "bg-red-50/50" : ""}
                      onClick={() => handleMarkAsViewed(alert)}
                    >
                      <TableCell>
                        {alert.alertType === "aumento" ? (
                          <Badge variant="destructive" className="gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Aumento
                          </Badge>
                        ) : (
                          <Badge variant="default" className="gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Redução
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {getSkuInfo(alert.skuId)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{alert.previousPeriod}</div>
                          <div className="text-muted-foreground">→ {alert.period}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(alert.previousUnitCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(alert.currentUnitCost)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-bold ${
                        alert.alertType === "aumento" ? "text-red-600" : "text-green-600"
                      }`}>
                        {alert.alertType === "aumento" ? "+" : ""}{formatPercent(alert.variationPercent)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {alert.status === "novo" && (
                              <DropdownMenuItem onClick={() => handleMarkAsViewed(alert)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Marcar como Visualizado
                              </DropdownMenuItem>
                            )}
                            {(alert.status === "novo" || alert.status === "visualizado") && (
                              <>
                                <DropdownMenuItem onClick={() => handleOpenResolve(alert)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Resolver
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedAlert(alert);
                                  handleResolve("ignorado");
                                }}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Ignorar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum alerta encontrado</p>
              <p className="text-sm">Os alertas são gerados automaticamente quando há variação significativa nos custos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Resolver Alerta
            </DialogTitle>
            <DialogDescription>
              Registre a resolução ou justificativa para este alerta de variação de custo
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Produto:</span>
                  <span className="font-medium">{getSkuInfo(selectedAlert.skuId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Variação:</span>
                  <span className={`font-mono font-bold ${
                    selectedAlert.alertType === "aumento" ? "text-red-600" : "text-green-600"
                  }`}>
                    {selectedAlert.alertType === "aumento" ? "+" : ""}{formatPercent(selectedAlert.variationPercent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Custo:</span>
                  <span className="font-mono">
                    {formatCurrency(selectedAlert.previousUnitCost)} → {formatCurrency(selectedAlert.currentUnitCost)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolução / Justificativa</Label>
                <Textarea
                  id="resolution"
                  placeholder="Descreva a causa da variação e as ações tomadas..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => handleResolve("resolvido")}
              disabled={updateStatusMutation.isPending}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Marcar como Resolvido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Limite de Alerta
            </DialogTitle>
            <DialogDescription>
              Defina o percentual de variação de custo que deve gerar um alerta
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="threshold">Limite de Variação (%)</Label>
              <Input
                id="threshold"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Alertas serão gerados quando a variação do custo unitário exceder este percentual
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Exemplo:</strong> Com limite de {thresholdValue}%, um produto com custo de R$ 10,00 
                gerará alerta se o novo custo for maior que R$ {(10 * (1 + parseFloat(thresholdValue || "0") / 100)).toFixed(2)} 
                ou menor que R$ {(10 * (1 - parseFloat(thresholdValue || "0") / 100)).toFixed(2)}.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveThreshold}
              disabled={updateSettingMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
