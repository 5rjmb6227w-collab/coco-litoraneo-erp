import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Calculator, 
  Package, 
  Users, 
  Factory, 
  Truck, 
  Receipt,
  TrendingUp,
  TrendingDown,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Percent,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CostCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSkuId?: number;
  defaultPeriod?: string;
}

export function CostCalculatorModal({ 
  open, 
  onOpenChange, 
  defaultSkuId,
  defaultPeriod 
}: CostCalculatorModalProps) {
  // Form state
  const [formData, setFormData] = useState({
    skuId: defaultSkuId?.toString() || "",
    period: defaultPeriod || new Date().toISOString().slice(0, 7),
    quantityProduced: "",
    destinationId: "",
    wastagePercent: "0",
    sellingPrice: "",
    observations: "",
  });

  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDetails, setShowDetails] = useState({
    direct: false,
    labor: false,
    indirect: false,
    variable: false,
  });

  // Queries
  const { data: skus } = trpc.skus.list.useQuery({});
  const { data: destinations } = trpc.costs.destinations.list.useQuery({ status: "ativo" });
  
  // Get selected SKU details
  const selectedSku = useMemo(() => {
    if (!formData.skuId || !skus) return null;
    return skus.find(s => s.id === parseInt(formData.skuId));
  }, [formData.skuId, skus]);

  // Mutations
  const calculateMutation = trpc.costs.records.calculate.useMutation({
    onSuccess: (data) => {
      setCalculationResult(data);
      setIsCalculating(false);
      toast.success("Custo calculado com sucesso!");
    },
    onError: (error) => {
      setIsCalculating(false);
      toast.error(`Erro ao calcular custo: ${error.message}`);
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        skuId: defaultSkuId?.toString() || "",
        period: defaultPeriod || new Date().toISOString().slice(0, 7),
        quantityProduced: "",
        destinationId: "",
        wastagePercent: "0",
        sellingPrice: selectedSku?.suggestedPrice || "",
        observations: "",
      });
      setCalculationResult(null);
    }
  }, [open, defaultSkuId, defaultPeriod]);

  // Update selling price when SKU changes
  useEffect(() => {
    if (selectedSku) {
      setFormData(prev => ({
        ...prev,
        sellingPrice: selectedSku.suggestedPrice || prev.sellingPrice,
      }));
    }
  }, [selectedSku]);

  const handleCalculate = (saveRecord: boolean = false) => {
    if (!formData.skuId || !formData.quantityProduced) {
      toast.error("Selecione um SKU e informe a quantidade produzida");
      return;
    }

    const quantity = parseFloat(formData.quantityProduced);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantidade produzida inválida");
      return;
    }

    setIsCalculating(true);
    calculateMutation.mutate({
      skuId: parseInt(formData.skuId),
      period: formData.period,
      quantityProduced: quantity,
      destinationId: formData.destinationId ? parseInt(formData.destinationId) : undefined,
      wastagePercent: parseFloat(formData.wastagePercent) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || undefined,
      observations: formData.observations || undefined,
      saveRecord,
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

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Calculate margin status
  const marginStatus = useMemo(() => {
    if (!calculationResult) return null;
    const margin = calculationResult.grossMarginPercent;
    if (margin >= 30) return { status: "excellent", label: "Excelente", color: "text-green-600" };
    if (margin >= 20) return { status: "good", label: "Boa", color: "text-blue-600" };
    if (margin >= 10) return { status: "acceptable", label: "Aceitável", color: "text-yellow-600" };
    if (margin > 0) return { status: "low", label: "Baixa", color: "text-orange-600" };
    return { status: "negative", label: "Negativa", color: "text-red-600" };
  }, [calculationResult]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Calculadora de Custos Inteligente
          </DialogTitle>
          <DialogDescription>
            Calcule o custo completo de produção usando o método de absorção simples
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left Column - Input Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados da Produção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">Produto (SKU) *</Label>
                  <Select 
                    value={formData.skuId} 
                    onValueChange={(value) => setFormData({ ...formData, skuId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {skus?.map(sku => (
                        <SelectItem key={sku.id} value={sku.id.toString()}>
                          {sku.code} - {sku.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period">Período</Label>
                    <Input
                      id="period"
                      type="month"
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade (kg) *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={formData.quantityProduced}
                      onChange={(e) => setFormData({ ...formData, quantityProduced: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination">Destino de Venda</Label>
                  <Select 
                    value={formData.destinationId} 
                    onValueChange={(value) => setFormData({ ...formData, destinationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {destinations?.map(dest => (
                        <SelectItem key={dest.id} value={dest.id.toString()}>
                          {dest.code} - {dest.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wastage">Perda/Refugo (%)</Label>
                    <Input
                      id="wastage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={formData.wastagePercent}
                      onChange={(e) => setFormData({ ...formData, wastagePercent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sellingPrice">Preço de Venda (R$)</Label>
                    <Input
                      id="sellingPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observações</Label>
                  <Textarea
                    id="observations"
                    placeholder="Observações sobre este cálculo..."
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => handleCalculate(false)} 
                    disabled={isCalculating}
                    className="flex-1"
                  >
                    {isCalculating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Calculando...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        Calcular
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleCalculate(true)} 
                    disabled={isCalculating || !calculationResult}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Selected SKU Info */}
            {selectedSku && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedSku.code}</p>
                      <p className="text-sm text-muted-foreground">{selectedSku.description}</p>
                    </div>
                  </div>
                  {selectedSku.suggestedPrice && (
                    <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço sugerido:</span>
                      <span className="font-mono font-medium">
                        {formatCurrency(selectedSku.suggestedPrice)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-4">
            {calculationResult ? (
              <>
                {/* Summary Card */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Custo Total</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(calculationResult.totalCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Custo Unitário</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(calculationResult.unitCost)}/kg
                        </p>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Preço Venda</p>
                        <p className="font-mono font-medium">
                          {formatCurrency(calculationResult.sellingPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Margem Bruta</p>
                        <p className="font-mono font-medium">
                          {formatCurrency(calculationResult.grossMargin)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Margem %</p>
                        <p className={`font-mono font-bold ${marginStatus?.color}`}>
                          {formatPercent(calculationResult.grossMarginPercent)}
                        </p>
                      </div>
                    </div>
                    {marginStatus && (
                      <div className={`mt-4 p-3 rounded-lg ${
                        marginStatus.status === "excellent" ? "bg-green-100 text-green-800" :
                        marginStatus.status === "good" ? "bg-blue-100 text-blue-800" :
                        marginStatus.status === "acceptable" ? "bg-yellow-100 text-yellow-800" :
                        marginStatus.status === "low" ? "bg-orange-100 text-orange-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        <div className="flex items-center gap-2">
                          {marginStatus.status === "negative" ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          <span className="font-medium">Margem {marginStatus.label}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Composição do Custo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Direct Costs */}
                    <Collapsible 
                      open={showDetails.direct} 
                      onOpenChange={(open) => setShowDetails(prev => ({ ...prev, direct: open }))}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Custos Diretos (Materiais)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">
                              {formatCurrency(calculationResult.directCostTotal)}
                            </span>
                            {showDetails.direct ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 py-2 space-y-1">
                          {calculationResult.directCostDetails?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.itemName}</span>
                              <span className="font-mono">{formatCurrency(item.totalCost)}</span>
                            </div>
                          ))}
                          {(!calculationResult.directCostDetails || calculationResult.directCostDetails.length === 0) && (
                            <p className="text-sm text-muted-foreground italic">Sem itens na BOM</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Labor Costs */}
                    <Collapsible 
                      open={showDetails.labor} 
                      onOpenChange={(open) => setShowDetails(prev => ({ ...prev, labor: open }))}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Mão de Obra</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">
                              {formatCurrency(calculationResult.laborCostTotal)}
                            </span>
                            {showDetails.labor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 py-2 space-y-1">
                          {calculationResult.laborCostDetails?.slice(0, 5).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.employeeName}</span>
                              <span className="font-mono">{formatCurrency(item.totalCost)}</span>
                            </div>
                          ))}
                          {calculationResult.laborCostDetails?.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              +{calculationResult.laborCostDetails.length - 5} colaboradores
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Indirect Costs */}
                    <Collapsible 
                      open={showDetails.indirect} 
                      onOpenChange={(open) => setShowDetails(prev => ({ ...prev, indirect: open }))}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted">
                          <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-orange-600" />
                            <span className="font-medium">Custos Indiretos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">
                              {formatCurrency(calculationResult.indirectCostTotal)}
                            </span>
                            {showDetails.indirect ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 py-2 space-y-1">
                          {calculationResult.indirectCostDetails?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{item.description}</span>
                              <span className="font-mono">{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                          {(!calculationResult.indirectCostDetails || calculationResult.indirectCostDetails.length === 0) && (
                            <p className="text-sm text-muted-foreground italic">Sem custos indiretos no período</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Variable Costs */}
                    <Collapsible 
                      open={showDetails.variable} 
                      onOpenChange={(open) => setShowDetails(prev => ({ ...prev, variable: open }))}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">Custos Variáveis</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">
                              {formatCurrency(calculationResult.freightCost + calculationResult.taxCost + calculationResult.wastageValue)}
                            </span>
                            {showDetails.variable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 py-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Frete</span>
                            <span className="font-mono">{formatCurrency(calculationResult.freightCost)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Impostos</span>
                            <span className="font-mono">{formatCurrency(calculationResult.taxCost)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Perdas ({formatPercent(calculationResult.wastagePercent)})
                            </span>
                            <span className="font-mono">{formatCurrency(calculationResult.wastageValue)}</span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>

                {/* Info */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Este cálculo usa o método de <strong>Custeio por Absorção Simples</strong>, 
                    rateando os custos indiretos proporcionalmente ao volume de produção.
                  </p>
                </div>
              </>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center py-12">
                  <Calculator className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    Preencha os dados e clique em "Calcular" para ver a composição do custo
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CostCalculatorModal;
