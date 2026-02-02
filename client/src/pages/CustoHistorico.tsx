import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  History, 
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Package,
  Eye,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CustoHistorico() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Generate period options (last 12 months)
  const periodOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
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
  const { data: records, isLoading } = trpc.costs.records.list.useQuery({
    status: filterStatus === "all" ? undefined : filterStatus as any,
    period: filterPeriod === "all" ? undefined : filterPeriod,
    limit: pageSize,
  });

  const { data: skus } = trpc.skus.list.useQuery({});
  const { data: destinations } = trpc.costs.destinations.list.useQuery({});

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

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    return `${monthNames[parseInt(month) - 1]}/${year}`;
  };

  const getSkuInfo = (skuId: number) => {
    const sku = skus?.find(s => s.id === skuId);
    return sku || { code: `#${skuId}`, description: "SKU não encontrado" };
  };

  const getDestinationInfo = (destinationId: number | null) => {
    if (!destinationId) return null;
    return destinations?.find(d => d.id === destinationId);
  };

  // Filter records by search term
  const filteredRecords = useMemo(() => {
    if (!records || !searchTerm) return records;
    const search = searchTerm.toLowerCase();
    return records.filter(record => {
      const sku = getSkuInfo(record.skuId);
      return (
        sku.code.toLowerCase().includes(search) ||
        sku.description.toLowerCase().includes(search) ||
        record.period.includes(search)
      );
    });
  }, [records, searchTerm, skus]);

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  // Status badge config
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    rascunho: { label: "Rascunho", variant: "secondary" },
    confirmado: { label: "Confirmado", variant: "default" },
    fechado: { label: "Fechado", variant: "outline" },
  };

  // Calculate margin status
  const getMarginStatus = (margin: number) => {
    if (margin >= 30) return { icon: TrendingUp, color: "text-green-600", label: "Excelente" };
    if (margin >= 20) return { icon: TrendingUp, color: "text-blue-600", label: "Boa" };
    if (margin >= 10) return { icon: Minus, color: "text-yellow-600", label: "Aceitável" };
    if (margin > 0) return { icon: TrendingDown, color: "text-orange-600", label: "Baixa" };
    return { icon: TrendingDown, color: "text-red-600", label: "Negativa" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Histórico de Custos
          </h1>
          <p className="text-muted-foreground mt-1">
            Consulte e analise os registros históricos de custos de produção
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Períodos</SelectItem>
                  {periodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Custo</CardTitle>
          <CardDescription>
            {filteredRecords?.length || 0} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRecords && filteredRecords.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const sku = getSkuInfo(record.skuId);
                    const status = statusConfig[record.status] || statusConfig.rascunho;
                    const marginStatus = getMarginStatus(parseFloat(record.grossMarginPercent || "0"));
                    const MarginIcon = marginStatus.icon;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {formatPeriod(record.period)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-mono font-medium">{sku.code}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {sku.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(record.quantityProduced || "0").toFixed(2)} kg
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(record.unitCost)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(record.totalCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 font-mono font-medium ${marginStatus.color}`}>
                            <MarginIcon className="h-4 w-4" />
                            {formatPercent(record.grossMarginPercent)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(record)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  Página {page}
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={!records || records.length < pageSize}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum registro de custo encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes do Registro de Custo
            </DialogTitle>
            <DialogDescription>
              Visualização completa da composição de custos
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="font-medium">{formatPeriod(selectedRecord.period)}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedRecord.status]?.variant || "secondary"}>
                    {statusConfig[selectedRecord.status]?.label || selectedRecord.status}
                  </Badge>
                </div>
              </div>

              {/* SKU Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-mono font-medium">{getSkuInfo(selectedRecord.skuId).code}</p>
                    <p className="text-sm text-muted-foreground">{getSkuInfo(selectedRecord.skuId).description}</p>
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium">Composição do Custo</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Quantidade Produzida</span>
                    <span className="font-mono">{parseFloat(selectedRecord.quantityProduced || "0").toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Custos Diretos (Materiais)</span>
                    <span className="font-mono">{formatCurrency(selectedRecord.directCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Mão de Obra</span>
                    <span className="font-mono">{formatCurrency(selectedRecord.laborCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Custos Indiretos</span>
                    <span className="font-mono">{formatCurrency(selectedRecord.indirectCostTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="font-mono">{formatCurrency(selectedRecord.freightCost)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Impostos</span>
                    <span className="font-mono">{formatCurrency(selectedRecord.taxCost)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Perdas ({formatPercent(selectedRecord.wastagePercent)})</span>
                    <span className="font-mono">{formatCurrency(selectedRecord.wastageValue)}</span>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-primary/5 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Custo Total</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(selectedRecord.totalCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Custo Unitário</span>
                  <span className="font-mono font-bold text-lg text-primary">{formatCurrency(selectedRecord.unitCost)}/kg</span>
                </div>
              </div>

              {/* Margin Analysis */}
              <div className="space-y-3">
                <h4 className="font-medium">Análise de Margem</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Preço de Venda</p>
                    <p className="font-mono font-medium">{formatCurrency(selectedRecord.sellingPrice)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Margem Bruta</p>
                    <p className="font-mono font-medium">{formatCurrency(selectedRecord.grossMargin)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Margem %</p>
                    <p className={`font-mono font-bold ${getMarginStatus(parseFloat(selectedRecord.grossMarginPercent || "0")).color}`}>
                      {formatPercent(selectedRecord.grossMarginPercent)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observations */}
              {selectedRecord.observations && (
                <div className="space-y-2">
                  <h4 className="font-medium">Observações</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedRecord.observations}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-muted-foreground pt-4 border-t">
                <p>Criado em: {formatDate(selectedRecord.createdAt)}</p>
                {selectedRecord.updatedAt && (
                  <p>Atualizado em: {formatDate(selectedRecord.updatedAt)}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
