import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Package,
  Factory,
  Users,
  Truck,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Calculator,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  FileText,
  Target,
  Percent,
} from "lucide-react";
import { CostCalculatorModal } from "@/components/CostCalculatorModal";

export default function CustoDashboard() {
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Queries
  const { data: summary, isLoading: loadingSummary } = trpc.costs.dashboard.getSummary.useQuery({
    period: selectedPeriod,
  });

  const { data: costsBySku, isLoading: loadingSkus } = trpc.costs.dashboard.getCostsBySku.useQuery({
    period: selectedPeriod,
  });

  const { data: monthlyComparison, isLoading: loadingComparison } = trpc.costs.dashboard.getMonthlyComparison.useQuery({
    months: 6,
  });

  const { data: alerts } = trpc.costs.alerts.list.useQuery({ status: "novo", limit: 5 });
  const { data: unreadAlertCount } = trpc.costs.alerts.getUnreadCount.useQuery();

  // Period navigation
  const handlePreviousPeriod = () => {
    const [year, month] = selectedPeriod.split("-").map(Number);
    const newDate = new Date(year, month - 2, 1);
    setSelectedPeriod(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextPeriod = () => {
    const [year, month] = selectedPeriod.split("-").map(Number);
    const newDate = new Date(year, month, 1);
    setSelectedPeriod(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
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
    return `${num.toFixed(1)}%`;
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  };

  const formatPeriodFull = (period: string) => {
    const [year, month] = period.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Calculate cost distribution for pie chart visualization
  const costDistribution = useMemo(() => {
    if (!summary) return [];
    const total = summary.totalCosts || 1;
    return [
      { name: "Diretos", value: summary.totalDirect, percent: (summary.totalDirect / total) * 100, color: "bg-blue-500" },
      { name: "Mão de Obra", value: summary.totalLabor, percent: (summary.totalLabor / total) * 100, color: "bg-green-500" },
      { name: "Indiretos", value: summary.totalIndirect, percent: (summary.totalIndirect / total) * 100, color: "bg-orange-500" },
      { name: "Frete", value: summary.totalFreight, percent: (summary.totalFreight / total) * 100, color: "bg-purple-500" },
      { name: "Impostos", value: summary.totalTax, percent: (summary.totalTax / total) * 100, color: "bg-red-500" },
      { name: "Perdas", value: summary.totalWastage, percent: (summary.totalWastage / total) * 100, color: "bg-gray-500" },
    ].filter(item => item.value > 0);
  }, [summary]);

  // Calculate month-over-month variation
  const monthVariation = useMemo(() => {
    if (!monthlyComparison || monthlyComparison.length < 2) return null;
    const current = monthlyComparison[monthlyComparison.length - 1];
    const previous = monthlyComparison[monthlyComparison.length - 2];
    
    const currentTotal = current.totalDirect + current.totalLabor + current.totalIndirect;
    const previousTotal = previous.totalDirect + previous.totalLabor + previous.totalIndirect;
    
    if (previousTotal === 0) return null;
    
    const variation = ((currentTotal - previousTotal) / previousTotal) * 100;
    return {
      value: variation,
      isPositive: variation > 0,
    };
  }, [monthlyComparison]);

  // Get margin status color
  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "text-green-600";
    if (margin >= 20) return "text-blue-600";
    if (margin >= 10) return "text-yellow-600";
    if (margin > 0) return "text-orange-600";
    return "text-red-600";
  };

  const isLoading = loadingSummary || loadingSkus || loadingComparison;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Dashboard de Custos
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise consolidada dos custos de produção
          </p>
        </div>
        <Button onClick={() => setShowCalculator(true)} className="gap-2">
          <Calculator className="h-4 w-4" />
          Calculadora de Custos
        </Button>
      </div>

      {/* Period Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={handlePreviousPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-semibold">{formatPeriodFull(selectedPeriod)}</span>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-primary/20" />
              {monthVariation && (
                <Badge variant={monthVariation.isPositive ? "destructive" : "default"} className="text-xs">
                  {monthVariation.isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {formatPercent(Math.abs(monthVariation.value))}
                </Badge>
              )}
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">{formatCurrency(summary?.totalCosts)}</p>
              <p className="text-xs text-muted-foreground">Custo Total do Período</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <Target className="h-8 w-8 text-primary/20" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary?.avgUnitCost)}/kg</p>
              <p className="text-xs text-muted-foreground">Custo Unitário Médio</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <Package className="h-8 w-8 text-primary/20" />
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">{summary?.totalProduction?.toFixed(0) || 0} kg</p>
              <p className="text-xs text-muted-foreground">Produção Total</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-primary/20" />
              {(unreadAlertCount || 0) > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadAlertCount} novos
                </Badge>
              )}
            </div>
            <div className="mt-2">
              <p className="text-2xl font-bold">{summary?.recordCount || 0}</p>
              <p className="text-xs text-muted-foreground">Registros de Custo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Distribuição de Custos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {costDistribution.length > 0 ? (
              <div className="space-y-3">
                {costDistribution.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        {item.name}
                      </span>
                      <span className="font-mono">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {formatPercent(item.percent)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sem dados para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Evolução Mensal dos Custos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyComparison && monthlyComparison.length > 0 ? (
              <div className="space-y-4">
                {/* Simple bar chart representation */}
                <div className="flex items-end justify-between gap-2 h-40">
                  {monthlyComparison.map((month, idx) => {
                    const total = month.totalDirect + month.totalLabor + month.totalIndirect;
                    const maxTotal = Math.max(...monthlyComparison.map(m => m.totalDirect + m.totalLabor + m.totalIndirect));
                    const height = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col items-center" style={{ height: '120px' }}>
                          <div 
                            className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                            style={{ height: `${height}%`, minHeight: total > 0 ? '4px' : '0' }}
                            title={formatCurrency(total)}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatPeriod(month.period)}</span>
                        <span className="text-xs font-mono">{formatCurrency(total)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>Diretos</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Mão de Obra</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded bg-orange-500" />
                    <span>Indiretos</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <LineChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sem dados históricos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost by SKU Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Custos por Produto
          </CardTitle>
          <CardDescription>
            Análise de custo e margem por SKU em {formatPeriodFull(selectedPeriod)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSkus ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : costsBySku && costsBySku.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Qtd. Produzida</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Preço Venda</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costsBySku.map((item) => (
                  <TableRow key={item.recordId}>
                    <TableCell className="font-mono font-medium">{item.skuCode}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{item.skuDescription}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantityProduced.toFixed(2)} kg
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.unitCost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.sellingPrice)}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-medium ${getMarginColor(item.grossMarginPercent)}`}>
                      {formatPercent(item.grossMarginPercent)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        item.status === "fechado" ? "outline" :
                        item.status === "confirmado" ? "default" : "secondary"
                      }>
                        {item.status === "fechado" ? "Fechado" :
                         item.status === "confirmado" ? "Confirmado" : "Rascunho"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum registro de custo encontrado para este período</p>
              <Button variant="link" onClick={() => setShowCalculator(true)}>
                Calcular primeiro custo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              Alertas de Variação de Custos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {alert.alertType === "aumento" ? (
                      <TrendingUp className="h-5 w-5 text-red-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        SKU #{alert.skuId} - Variação de {formatPercent(alert.variationPercent)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(alert.previousUnitCost)} → {formatCurrency(alert.currentUnitCost)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={alert.alertType === "aumento" ? "destructive" : "default"}>
                    {alert.alertType === "aumento" ? "Aumento" : "Redução"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Calculator Modal */}
      <CostCalculatorModal 
        open={showCalculator} 
        onOpenChange={setShowCalculator}
        defaultPeriod={selectedPeriod}
      />
    </div>
  );
}
