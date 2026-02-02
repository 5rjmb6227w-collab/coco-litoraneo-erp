import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  Target,
  DollarSign,
  Percent,
  Package,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function CustoSimulador() {
  // Form state
  const [formData, setFormData] = useState({
    skuId: "",
    baseCost: "",
    materialVariation: 0,
    laborVariation: 0,
    indirectVariation: 0,
    targetMargin: 25,
    currentPrice: "",
  });

  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Queries
  const { data: skus } = trpc.skus.list.useQuery({});
  const { data: latestRecords } = trpc.costs.records.list.useQuery({ limit: 50 });

  // Get latest cost record for selected SKU
  const latestSkuRecord = useMemo(() => {
    if (!formData.skuId || !latestRecords) return null;
    return latestRecords.find((r: any) => r.skuId === parseInt(formData.skuId));
  }, [formData.skuId, latestRecords]);

  // Auto-fill when SKU is selected
  const handleSkuChange = (skuId: string) => {
    setFormData(prev => ({ ...prev, skuId }));
    
    if (skuId && latestRecords) {
      const record = latestRecords.find((r: any) => r.skuId === parseInt(skuId));
      if (record) {
        setFormData(prev => ({
          ...prev,
          skuId,
          baseCost: record.unitCost || "",
          currentPrice: record.sellingPrice || "",
        }));
      }
    }
    setSimulationResult(null);
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
    return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
  };

  const handleSimulate = () => {
    const baseCost = parseFloat(formData.baseCost);
    if (isNaN(baseCost) || baseCost <= 0) {
      toast.error("Informe um custo base válido");
      return;
    }

    // Calculate simulated cost with variations
    const materialFactor = 1 + (formData.materialVariation / 100);
    const laborFactor = 1 + (formData.laborVariation / 100);
    const indirectFactor = 1 + (formData.indirectVariation / 100);

    // Assuming typical cost distribution: 60% materials, 25% labor, 15% indirect
    const materialPortion = baseCost * 0.60;
    const laborPortion = baseCost * 0.25;
    const indirectPortion = baseCost * 0.15;

    const simulatedCost = 
      (materialPortion * materialFactor) +
      (laborPortion * laborFactor) +
      (indirectPortion * indirectFactor);

    // Calculate suggested price based on target margin
    const targetMarginDecimal = formData.targetMargin / 100;
    const suggestedPrice = simulatedCost / (1 - targetMarginDecimal);

    // Calculate margin with current price
    const currentPrice = parseFloat(formData.currentPrice) || suggestedPrice;
    const currentMargin = currentPrice - simulatedCost;
    const currentMarginPercent = (currentMargin / currentPrice) * 100;

    // Calculate price adjustment needed
    const priceAdjustment = suggestedPrice - currentPrice;
    const priceAdjustmentPercent = (priceAdjustment / currentPrice) * 100;

    // Break-even analysis
    const breakEvenPrice = simulatedCost;

    setSimulationResult({
      baseCost,
      simulatedCost,
      costVariation: simulatedCost - baseCost,
      costVariationPercent: ((simulatedCost - baseCost) / baseCost) * 100,
      suggestedPrice,
      currentPrice,
      currentMargin,
      currentMarginPercent,
      priceAdjustment,
      priceAdjustmentPercent,
      breakEvenPrice,
      targetMargin: formData.targetMargin,
      materialImpact: (materialPortion * materialFactor) - materialPortion,
      laborImpact: (laborPortion * laborFactor) - laborPortion,
      indirectImpact: (indirectPortion * indirectFactor) - indirectPortion,
    });
  };

  const handleReset = () => {
    setFormData({
      skuId: "",
      baseCost: "",
      materialVariation: 0,
      laborVariation: 0,
      indirectVariation: 0,
      targetMargin: 25,
      currentPrice: "",
    });
    setSimulationResult(null);
  };

  // Get margin status
  const getMarginStatus = (margin: number) => {
    if (margin >= 30) return { status: "excellent", label: "Excelente", color: "text-green-600", bg: "bg-green-100" };
    if (margin >= 20) return { status: "good", label: "Boa", color: "text-blue-600", bg: "bg-blue-100" };
    if (margin >= 10) return { status: "acceptable", label: "Aceitável", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (margin > 0) return { status: "low", label: "Baixa", color: "text-orange-600", bg: "bg-orange-100" };
    return { status: "negative", label: "Negativa", color: "text-red-600", bg: "bg-red-100" };
  };

  const selectedSku = useMemo(() => {
    if (!formData.skuId || !skus) return null;
    return skus.find(s => s.id === parseInt(formData.skuId));
  }, [formData.skuId, skus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-7 w-7 text-primary" />
            Simulador de Preços
          </h1>
          <p className="text-muted-foreground mt-1">
            Simule cenários de variação de custos e calcule preços ideais
          </p>
        </div>
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados Base</CardTitle>
              <CardDescription>
                Selecione um produto ou informe os valores manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Produto (opcional)</Label>
                <Select value={formData.skuId} onValueChange={handleSkuChange}>
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

              {selectedSku && latestSkuRecord && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                  <p className="text-muted-foreground">Último custo registrado:</p>
                  <p className="font-mono font-medium">{formatCurrency(latestSkuRecord.unitCost)}/kg</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseCost">Custo Base (R$/kg)</Label>
                  <Input
                    id="baseCost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.baseCost}
                    onChange={(e) => setFormData({ ...formData, baseCost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPrice">Preço Atual (R$/kg)</Label>
                  <Input
                    id="currentPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.currentPrice}
                    onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cenário de Variação</CardTitle>
              <CardDescription>
                Ajuste os percentuais de variação para simular cenários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Material Variation */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Variação de Materiais</Label>
                  <span className={`font-mono text-sm ${
                    formData.materialVariation > 0 ? "text-red-600" : 
                    formData.materialVariation < 0 ? "text-green-600" : ""
                  }`}>
                    {formatPercent(formData.materialVariation)}
                  </span>
                </div>
                <Slider
                  value={[formData.materialVariation]}
                  onValueChange={([value]) => setFormData({ ...formData, materialVariation: value })}
                  min={-50}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>

              {/* Labor Variation */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Variação de Mão de Obra</Label>
                  <span className={`font-mono text-sm ${
                    formData.laborVariation > 0 ? "text-red-600" : 
                    formData.laborVariation < 0 ? "text-green-600" : ""
                  }`}>
                    {formatPercent(formData.laborVariation)}
                  </span>
                </div>
                <Slider
                  value={[formData.laborVariation]}
                  onValueChange={([value]) => setFormData({ ...formData, laborVariation: value })}
                  min={-50}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>

              {/* Indirect Variation */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Variação de Custos Indiretos</Label>
                  <span className={`font-mono text-sm ${
                    formData.indirectVariation > 0 ? "text-red-600" : 
                    formData.indirectVariation < 0 ? "text-green-600" : ""
                  }`}>
                    {formatPercent(formData.indirectVariation)}
                  </span>
                </div>
                <Slider
                  value={[formData.indirectVariation]}
                  onValueChange={([value]) => setFormData({ ...formData, indirectVariation: value })}
                  min={-50}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-50%</span>
                  <span>0%</span>
                  <span>+50%</span>
                </div>
              </div>

              <Separator />

              {/* Target Margin */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Margem Alvo</Label>
                  <span className="font-mono text-sm text-primary font-bold">
                    {formData.targetMargin}%
                  </span>
                </div>
                <Slider
                  value={[formData.targetMargin]}
                  onValueChange={([value]) => setFormData({ ...formData, targetMargin: value })}
                  min={5}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </div>

              <Button onClick={handleSimulate} className="w-full gap-2">
                <Calculator className="h-4 w-4" />
                Simular Cenário
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {simulationResult ? (
            <>
              {/* Cost Impact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Impacto no Custo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Custo Base</p>
                      <p className="text-xl font-mono font-medium">
                        {formatCurrency(simulationResult.baseCost)}
                      </p>
                    </div>
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Custo Simulado</p>
                      <p className="text-xl font-mono font-bold text-primary">
                        {formatCurrency(simulationResult.simulatedCost)}
                      </p>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg flex items-center justify-between ${
                    simulationResult.costVariation > 0 ? "bg-red-100" : "bg-green-100"
                  }`}>
                    <div className="flex items-center gap-2">
                      {simulationResult.costVariation > 0 ? (
                        <TrendingUp className="h-5 w-5 text-red-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-green-600" />
                      )}
                      <span className={simulationResult.costVariation > 0 ? "text-red-800" : "text-green-800"}>
                        Variação do Custo
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-bold ${
                        simulationResult.costVariation > 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {formatCurrency(simulationResult.costVariation)}
                      </p>
                      <p className={`text-sm font-mono ${
                        simulationResult.costVariation > 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {formatPercent(simulationResult.costVariationPercent)}
                      </p>
                    </div>
                  </div>

                  {/* Impact breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impacto Materiais:</span>
                      <span className={`font-mono ${simulationResult.materialImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(simulationResult.materialImpact)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impacto Mão de Obra:</span>
                      <span className={`font-mono ${simulationResult.laborImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(simulationResult.laborImpact)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impacto Indiretos:</span>
                      <span className={`font-mono ${simulationResult.indirectImpact > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(simulationResult.indirectImpact)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Recommendation */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Recomendação de Preço
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Preço Atual</p>
                      <p className="font-mono font-medium">{formatCurrency(simulationResult.currentPrice)}</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Preço Sugerido</p>
                      <p className="font-mono font-bold text-primary">{formatCurrency(simulationResult.suggestedPrice)}</p>
                    </div>
                  </div>

                  {simulationResult.priceAdjustment !== 0 && (
                    <div className={`p-4 rounded-lg ${
                      simulationResult.priceAdjustment > 0 ? "bg-orange-100" : "bg-green-100"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {simulationResult.priceAdjustment > 0 ? (
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        <span className={simulationResult.priceAdjustment > 0 ? "text-orange-800 font-medium" : "text-green-800 font-medium"}>
                          {simulationResult.priceAdjustment > 0 ? "Ajuste Necessário" : "Margem Favorável"}
                        </span>
                      </div>
                      <p className={`text-sm ${simulationResult.priceAdjustment > 0 ? "text-orange-700" : "text-green-700"}`}>
                        {simulationResult.priceAdjustment > 0 
                          ? `Para manter a margem de ${simulationResult.targetMargin}%, o preço deve aumentar ${formatCurrency(simulationResult.priceAdjustment)} (${formatPercent(simulationResult.priceAdjustmentPercent)}).`
                          : `O preço atual permite uma margem superior à meta de ${simulationResult.targetMargin}%.`
                        }
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Margin Analysis */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Análise de Margem</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-lg ${getMarginStatus(simulationResult.currentMarginPercent).bg}`}>
                        <p className="text-xs text-muted-foreground">Margem com Preço Atual</p>
                        <p className={`text-2xl font-mono font-bold ${getMarginStatus(simulationResult.currentMarginPercent).color}`}>
                          {simulationResult.currentMarginPercent.toFixed(1)}%
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {getMarginStatus(simulationResult.currentMarginPercent).label}
                        </Badge>
                      </div>
                      <div className="bg-primary/10 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground">Margem Alvo</p>
                        <p className="text-2xl font-mono font-bold text-primary">
                          {simulationResult.targetMargin}%
                        </p>
                        <Badge variant="default" className="mt-1">Meta</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Break-even */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium text-sm">Ponto de Equilíbrio</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      O preço mínimo para não ter prejuízo é <span className="font-mono font-medium">{formatCurrency(simulationResult.breakEvenPrice)}/kg</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[500px]">
              <CardContent className="text-center py-12">
                <Calculator className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground mb-2">
                  Configure os parâmetros e clique em "Simular Cenário"
                </p>
                <p className="text-sm text-muted-foreground">
                  O simulador calculará o impacto das variações no custo e sugerirá o preço ideal
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
