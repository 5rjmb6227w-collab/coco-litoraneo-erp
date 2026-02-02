import { useState, useMemo } from "react";
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
  Lock, 
  Unlock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  FileText,
  Package,
  DollarSign,
  ClipboardCheck,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CustoFechamento() {
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [closureNotes, setClosureNotes] = useState("");
  const [selectedClosure, setSelectedClosure] = useState<any>(null);

  // Generate period options (last 24 months)
  const periodOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      options.push({ value, label });
    }
    return options;
  }, []);

  // Queries
  const { data: closures, isLoading: loadingClosures, refetch: refetchClosures } = trpc.costs.periods.list.useQuery();
  const { data: periodSummary, isLoading: loadingSummary } = trpc.costs.dashboard.getSummary.useQuery({
    period: selectedPeriod,
  });
  const { data: periodRecords } = trpc.costs.records.list.useQuery({
    period: selectedPeriod,
  });

  // Mutations
  const utils = trpc.useUtils();

  const closePeriodMutation = trpc.costs.periods.close.useMutation({
    onSuccess: () => {
      toast.success("Período fechado com sucesso!");
      setShowCloseModal(false);
      setClosureNotes("");
      utils.costs.periods.list.invalidate();
      utils.costs.records.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Erro ao fechar período: ${error.message}`);
    },
  });

  // Nota: reopen não existe no router atual, removido
  const handleReopenPeriod = () => {
    toast.info("Funcionalidade de reabertura em desenvolvimento");
    setShowReopenConfirm(false);
    setSelectedClosure(null);
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (!num && num !== 0) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
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

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Check if period is already closed
  const isPeriodClosed = useMemo(() => {
    return closures?.some((c: any) => c.period === selectedPeriod && c.status === "fechado");
  }, [closures, selectedPeriod]);

  const selectedPeriodClosure = useMemo(() => {
    return closures?.find((c: any) => c.period === selectedPeriod);
  }, [closures, selectedPeriod]);

  // Period stats
  const draftRecords = periodRecords?.filter(r => r.status === "rascunho").length || 0;
  const confirmedRecords = periodRecords?.filter(r => r.status === "confirmado").length || 0;
  const closedRecords = periodRecords?.filter(r => r.status === "fechado").length || 0;
  const totalRecords = periodRecords?.length || 0;

  const handleClosePeriod = () => {
    if (draftRecords > 0) {
      toast.error(`Existem ${draftRecords} registro(s) em rascunho. Confirme ou exclua antes de fechar.`);
      return;
    }
    closePeriodMutation.mutate({
      period: selectedPeriod,
      observations: closureNotes || undefined,
    });
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lock className="h-7 w-7 text-primary" />
            Fechamento de Período
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o fechamento mensal dos custos de produção
          </p>
        </div>
      </div>

      {/* Period Selection */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Label>Período:</Label>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPeriodClosed ? (
              <Badge variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Período Fechado
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Unlock className="h-3 w-3" />
                Período Aberto
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Period Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{totalRecords}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total de Registros</p>
          </CardContent>
        </Card>
        <Card className={draftRecords > 0 ? "border-yellow-200 bg-yellow-50/50" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {draftRecords > 0 && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
              <span className="text-2xl font-bold">{draftRecords}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rascunhos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{confirmedRecords}</span>
            </div>
            <p className="text-xs text-muted-foreground">Confirmados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{closedRecords}</span>
            </div>
            <p className="text-xs text-muted-foreground">Fechados</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Resumo Financeiro - {formatPeriod(selectedPeriod)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSummary ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : periodSummary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-xl font-mono font-bold">{formatCurrency(periodSummary.totalCosts)}</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Custo Médio</p>
                <p className="text-xl font-mono font-bold text-primary">{formatCurrency(periodSummary.avgUnitCost)}/kg</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Produção Total</p>
                <p className="text-xl font-mono font-bold">{periodSummary.totalProduction?.toFixed(0) || 0} kg</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Margem Média</p>
                <p className="text-xl font-mono font-bold">{((periodSummary.totalCosts > 0 && periodSummary.totalProduction > 0) ? ((periodSummary.avgUnitCost / periodSummary.totalProduction) * 100).toFixed(1) : 0)}%</p>
              </div>
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">Nenhum dado disponível</p>
          )}
        </CardContent>
      </Card>

      {/* Close Period Action */}
      {!isPeriodClosed && (
        <Card className={draftRecords > 0 ? "border-yellow-200" : "border-green-200"}>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {draftRecords > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5" />
                ) : (
                  <ClipboardCheck className="h-6 w-6 text-green-600 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {draftRecords > 0 
                      ? "Período com pendências"
                      : "Período pronto para fechamento"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {draftRecords > 0 
                      ? `Existem ${draftRecords} registro(s) em rascunho que precisam ser confirmados ou excluídos.`
                      : "Todos os registros estão confirmados. Você pode fechar este período."
                    }
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setShowCloseModal(true)}
                disabled={draftRecords > 0}
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                Fechar Período
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closed Period Info */}
      {isPeriodClosed && selectedPeriodClosure && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lock className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Período Fechado</p>
                  <p className="text-sm text-blue-600">
                    Fechado em {formatDate(selectedPeriodClosure.closedAt)} por {selectedPeriodClosure.closedByName || "Sistema"}
                  </p>
                  {selectedPeriodClosure.observations && (
                    <p className="text-sm text-blue-600 mt-1">
                      <strong>Observações:</strong> {selectedPeriodClosure.observations}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedClosure(selectedPeriodClosure);
                  setShowReopenConfirm(true);
                }}
                className="gap-2"
              >
                <Unlock className="h-4 w-4" />
                Reabrir Período
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closure History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Fechamentos</CardTitle>
          <CardDescription>
            Períodos fechados e reabertos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingClosures ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : closures && closures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fechado em</TableHead>
                  <TableHead>Fechado por</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Custo Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closures.map((closure: any) => (
                  <TableRow key={closure.id}>
                    <TableCell className="font-medium">
                      {formatPeriod(closure.period)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={closure.status === "fechado" ? "default" : "secondary"}>
                        {closure.status === "fechado" ? (
                          <><Lock className="h-3 w-3 mr-1" /> Fechado</>
                        ) : (
                          <><Unlock className="h-3 w-3 mr-1" /> Reaberto</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(closure.closedAt)}</TableCell>
                    <TableCell>{closure.closedByName || "-"}</TableCell>
                    <TableCell className="font-mono">{closure.totalRecords || 0}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(closure.totalCost)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {closure.status === "fechado" && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedClosure(closure);
                              setShowReopenConfirm(true);
                            }}>
                              <Unlock className="h-4 w-4 mr-2" />
                              Reabrir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setSelectedPeriod(closure.period)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Período
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum período foi fechado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close Period Modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Fechar Período
            </DialogTitle>
            <DialogDescription>
              Confirme o fechamento do período {formatPeriod(selectedPeriod)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Período:</span>
                <span className="font-medium">{formatPeriod(selectedPeriod)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Registros:</span>
                <span className="font-mono">{totalRecords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Custo Total:</span>
                <span className="font-mono">{formatCurrency(periodSummary?.totalCosts)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre este fechamento..."
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-yellow-100 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Atenção</p>
                  <p>Após o fechamento, os registros de custo deste período não poderão ser editados. 
                  Você poderá reabrir o período se necessário.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleClosePeriod}
              disabled={closePeriodMutation.isPending}
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {closePeriodMutation.isPending ? "Fechando..." : "Confirmar Fechamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Confirmation */}
      <AlertDialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Reabrir Período
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reabrir o período {selectedClosure ? formatPeriod(selectedClosure.period) : ""}?
              Os registros de custo poderão ser editados novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReopenPeriod}
            >
              Reabrir Período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
