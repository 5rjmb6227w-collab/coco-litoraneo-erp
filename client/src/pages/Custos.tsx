import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calculator,
  Package,
  Factory,
  Zap,
  Users,
  Wrench,
  Building,
  Plus,
  FileText,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";

export default function Custos() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [showNewCostModal, setShowNewCostModal] = useState(false);
  const [showNewFixedCostModal, setShowNewFixedCostModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("mes-atual");

  // Queries
  const { data: productionCosts, isLoading: loadingCosts } = trpc.costs.listProductionCosts.useQuery({});
  const { data: fixedCosts, isLoading: loadingFixed } = trpc.costs.listFixedCosts.useQuery({});
  const { data: skus } = trpc.skus.list.useQuery({});
  const { data: costSummary } = trpc.costs.getSummary.useQuery();

  // Mutations
  const createProductionCost = trpc.costs.createProductionCost.useMutation({
    onSuccess: () => {
      toast.success("Custo de produção registrado com sucesso!");
      setShowNewCostModal(false);
    },
    onError: (error) => {
      toast.error(`Erro ao registrar custo: ${error.message}`);
    },
  });

  const createFixedCost = trpc.costs.createFixedCost.useMutation({
    onSuccess: () => {
      toast.success("Custo fixo cadastrado com sucesso!");
      setShowNewFixedCostModal(false);
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar custo fixo: ${error.message}`);
    },
  });

  // Form states
  const [newCost, setNewCost] = useState({
    skuId: "",
    productionDate: new Date().toISOString().split("T")[0],
    quantityProduced: "",
    rawMaterialCost: "",
    packagingCost: "",
    laborCost: "",
    energyCost: "",
    overheadCost: "",
    maintenanceCost: "",
  });

  const [newFixedCost, setNewFixedCost] = useState({
    description: "",
    category: "outros" as const,
    monthlyValue: "",
    observations: "",
  });

  const handleCreateCost = () => {
    if (!newCost.skuId || !newCost.quantityProduced) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    createProductionCost.mutate({
      skuId: parseInt(newCost.skuId),
      productionDate: newCost.productionDate,
      quantityProduced: parseFloat(newCost.quantityProduced),
      rawMaterialCost: parseFloat(newCost.rawMaterialCost) || 0,
      packagingCost: parseFloat(newCost.packagingCost) || 0,
      laborCost: parseFloat(newCost.laborCost) || 0,
      energyCost: parseFloat(newCost.energyCost) || 0,
      overheadCost: parseFloat(newCost.overheadCost) || 0,
      maintenanceCost: parseFloat(newCost.maintenanceCost) || 0,
    });
  };

  const handleCreateFixedCost = () => {
    if (!newFixedCost.description || !newFixedCost.monthlyValue) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    createFixedCost.mutate({
      description: newFixedCost.description,
      category: newFixedCost.category,
      monthlyValue: parseFloat(newFixedCost.monthlyValue),
      observations: newFixedCost.observations,
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

  // Calcular totais
  const totalDirectCosts = productionCosts?.reduce((sum, c) => {
    return sum + 
      (parseFloat(c.rawMaterialCost || "0")) +
      (parseFloat(c.packagingCost || "0")) +
      (parseFloat(c.laborCost || "0")) +
      (parseFloat(c.energyCost || "0"));
  }, 0) || 0;

  const totalIndirectCosts = productionCosts?.reduce((sum, c) => {
    return sum +
      (parseFloat(c.overheadCost || "0")) +
      (parseFloat(c.maintenanceCost || "0")) +
      (parseFloat(c.depreciationCost || "0"));
  }, 0) || 0;

  const totalFixedCosts = fixedCosts?.reduce((sum, c) => {
    return sum + (parseFloat(c.monthlyValue || "0"));
  }, 0) || 0;

  const totalCosts = totalDirectCosts + totalIndirectCosts + totalFixedCosts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Módulo de Custos
          </h1>
          <p className="text-muted-foreground">
            Gestão completa de custos de produção, fixos e análise de rentabilidade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes-atual">Mês Atual</SelectItem>
              <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
              <SelectItem value="trimestre">Último Trimestre</SelectItem>
              <SelectItem value="ano">Ano Atual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCosts)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> +5.2% vs mês anterior
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos Diretos</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDirectCosts)}</div>
            <p className="text-xs text-muted-foreground">
              {totalCosts > 0 ? ((totalDirectCosts / totalCosts) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos Indiretos</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIndirectCosts)}</div>
            <p className="text-xs text-muted-foreground">
              {totalCosts > 0 ? ((totalIndirectCosts / totalCosts) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custos Fixos</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFixedCosts)}</div>
            <p className="text-xs text-muted-foreground">
              {totalCosts > 0 ? ((totalFixedCosts / totalCosts) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="producao">Custos Produção</TabsTrigger>
          <TabsTrigger value="fixos">Custos Fixos</TabsTrigger>
          <TabsTrigger value="por-sku">Por SKU</TabsTrigger>
          <TabsTrigger value="rentabilidade">Rentabilidade</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Composição de Custos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Composição de Custos
                </CardTitle>
                <CardDescription>Distribuição por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm">Matéria-Prima</span>
                    </div>
                    <span className="font-medium">{formatCurrency(productionCosts?.reduce((sum, c) => sum + parseFloat(c.rawMaterialCost || "0"), 0) || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">Embalagem</span>
                    </div>
                    <span className="font-medium">{formatCurrency(productionCosts?.reduce((sum, c) => sum + parseFloat(c.packagingCost || "0"), 0) || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">Mão de Obra</span>
                    </div>
                    <span className="font-medium">{formatCurrency(productionCosts?.reduce((sum, c) => sum + parseFloat(c.laborCost || "0"), 0) || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-sm">Energia</span>
                    </div>
                    <span className="font-medium">{formatCurrency(productionCosts?.reduce((sum, c) => sum + parseFloat(c.energyCost || "0"), 0) || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm">Overhead</span>
                    </div>
                    <span className="font-medium">{formatCurrency(productionCosts?.reduce((sum, c) => sum + parseFloat(c.overheadCost || "0"), 0) || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">Manutenção</span>
                    </div>
                    <span className="font-medium">{formatCurrency(productionCosts?.reduce((sum, c) => sum + parseFloat(c.maintenanceCost || "0"), 0) || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evolução Mensal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Evolução Mensal
                </CardTitle>
                <CardDescription>Comparativo dos últimos meses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Janeiro 2026</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatCurrency(totalCosts)}</span>
                      <Badge variant="destructive" className="text-xs">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        +5.2%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Dezembro 2025</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatCurrency(totalCosts * 0.95)}</span>
                      <Badge variant="secondary" className="text-xs">
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                        -2.1%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Novembro 2025</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatCurrency(totalCosts * 0.97)}</span>
                      <Badge variant="secondary" className="text-xs">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        +1.8%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custos de Produção */}
        <TabsContent value="producao" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Custos de Produção</h3>
            <Dialog open={showNewCostModal} onOpenChange={setShowNewCostModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Registro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Registrar Custo de Produção</DialogTitle>
                  <DialogDescription>
                    Registre os custos de uma produção específica
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Produto (SKU) *</Label>
                      <Select
                        value={newCost.skuId}
                        onValueChange={(v) => setNewCost({ ...newCost, skuId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o SKU" />
                        </SelectTrigger>
                        <SelectContent>
                          {skus?.map((sku) => (
                            <SelectItem key={sku.id} value={sku.id.toString()}>
                              {sku.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Produção *</Label>
                      <Input
                        type="date"
                        value={newCost.productionDate}
                        onChange={(e) => setNewCost({ ...newCost, productionDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade Produzida (kg) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newCost.quantityProduced}
                      onChange={(e) => setNewCost({ ...newCost, quantityProduced: e.target.value })}
                    />
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Factory className="h-4 w-4" />
                      Custos Diretos
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Matéria-Prima (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newCost.rawMaterialCost}
                          onChange={(e) => setNewCost({ ...newCost, rawMaterialCost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Embalagem (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newCost.packagingCost}
                          onChange={(e) => setNewCost({ ...newCost, packagingCost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mão de Obra (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newCost.laborCost}
                          onChange={(e) => setNewCost({ ...newCost, laborCost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Energia (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newCost.energyCost}
                          onChange={(e) => setNewCost({ ...newCost, energyCost: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Custos Indiretos
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Overhead (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newCost.overheadCost}
                          onChange={(e) => setNewCost({ ...newCost, overheadCost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Manutenção (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={newCost.maintenanceCost}
                          onChange={(e) => setNewCost({ ...newCost, maintenanceCost: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewCostModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCost} disabled={createProductionCost.isPending}>
                    {createProductionCost.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qtd (kg)</TableHead>
                    <TableHead className="text-right">Custo Direto</TableHead>
                    <TableHead className="text-right">Custo Indireto</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Custo/kg</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCosts ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : productionCosts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum custo de produção registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    productionCosts?.map((cost) => {
                      const directCost = 
                        parseFloat(cost.rawMaterialCost || "0") +
                        parseFloat(cost.packagingCost || "0") +
                        parseFloat(cost.laborCost || "0") +
                        parseFloat(cost.energyCost || "0");
                      const indirectCost =
                        parseFloat(cost.overheadCost || "0") +
                        parseFloat(cost.maintenanceCost || "0") +
                        parseFloat(cost.depreciationCost || "0");
                      const totalCost = directCost + indirectCost;
                      const unitCost = parseFloat(cost.quantityProduced) > 0 
                        ? totalCost / parseFloat(cost.quantityProduced) 
                        : 0;

                      return (
                        <TableRow key={cost.id}>
                          <TableCell>
                            {new Date(cost.productionDate).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>{cost.skuId}</TableCell>
                          <TableCell className="text-right">
                            {parseFloat(cost.quantityProduced).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(directCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(indirectCost)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(totalCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(unitCost)}/kg
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custos Fixos */}
        <TabsContent value="fixos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Custos Fixos Mensais</h3>
            <Dialog open={showNewFixedCostModal} onOpenChange={setShowNewFixedCostModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Custo Fixo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Custo Fixo</DialogTitle>
                  <DialogDescription>
                    Adicione um novo custo fixo mensal
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Descrição *</Label>
                    <Input
                      placeholder="Ex: Aluguel do galpão, Conta de luz..."
                      value={newFixedCost.description}
                      onChange={(e) => setNewFixedCost({ ...newFixedCost, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={newFixedCost.category}
                      onValueChange={(v: any) => setNewFixedCost({ ...newFixedCost, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aluguel">Aluguel</SelectItem>
                        <SelectItem value="energia">Energia</SelectItem>
                        <SelectItem value="agua">Água</SelectItem>
                        <SelectItem value="gas">Gás</SelectItem>
                        <SelectItem value="internet">Internet</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="seguro">Seguro</SelectItem>
                        <SelectItem value="impostos">Impostos</SelectItem>
                        <SelectItem value="salarios">Salários</SelectItem>
                        <SelectItem value="beneficios">Benefícios</SelectItem>
                        <SelectItem value="depreciacao">Depreciação</SelectItem>
                        <SelectItem value="limpeza">Limpeza</SelectItem>
                        <SelectItem value="seguranca">Segurança</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Mensal (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newFixedCost.monthlyValue}
                      onChange={(e) => setNewFixedCost({ ...newFixedCost, monthlyValue: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input
                      placeholder="Observações adicionais"
                      value={newFixedCost.observations}
                      onChange={(e) => setNewFixedCost({ ...newFixedCost, observations: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewFixedCostModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateFixedCost} disabled={createFixedCost.isPending}>
                    {createFixedCost.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor Mensal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingFixed ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : fixedCosts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum custo fixo cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    fixedCosts?.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="font-medium">{cost.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{cost.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cost.monthlyValue)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cost.active ? "default" : "secondary"}>
                            {cost.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por SKU */}
        <TabsContent value="por-sku" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custo por Produto (SKU)</CardTitle>
              <CardDescription>
                Análise de custo unitário por produto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd Produzida</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                    <TableHead className="text-right">Custo/kg</TableHead>
                    <TableHead className="text-right">Margem Est.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skus?.map((sku) => {
                    const skuCosts = productionCosts?.filter((c: any) => c.skuId === sku.id) || [];
                    const totalQty = skuCosts.reduce((sum: number, c: any) => sum + parseFloat(c.quantityProduced), 0);
                    const totalCost = skuCosts.reduce((sum: number, c: any) => {
                      return sum +
                        parseFloat(c.rawMaterialCost || "0") +
                        parseFloat(c.packagingCost || "0") +
                        parseFloat(c.laborCost || "0") +
                        parseFloat(c.energyCost || "0") +
                        parseFloat(c.overheadCost || "0") +
                        parseFloat(c.maintenanceCost || "0");
                    }, 0);
                    const unitCost = totalQty > 0 ? totalCost / totalQty : 0;
                    const estimatedMargin = 35; // Margem estimada de 35%

                    return (
                      <TableRow key={sku.id}>
                        <TableCell className="font-medium">{sku.description}</TableCell>
                        <TableCell className="text-right">{totalQty.toFixed(2)} kg</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(unitCost)}/kg</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={estimatedMargin >= 30 ? "default" : "destructive"}>
                            {estimatedMargin}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rentabilidade */}
        <TabsContent value="rentabilidade" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Indicadores de Rentabilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <span className="text-sm font-medium">Margem Bruta</span>
                  <span className="text-lg font-bold text-green-600">42.5%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <span className="text-sm font-medium">Margem de Contribuição</span>
                  <span className="text-lg font-bold text-blue-600">35.2%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <span className="text-sm font-medium">Margem Líquida</span>
                  <span className="text-lg font-bold text-purple-600">18.7%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Ponto de Equilíbrio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Faturamento Necessário</p>
                  <p className="text-3xl font-bold">{formatCurrency(totalFixedCosts / 0.35)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para cobrir custos fixos de {formatCurrency(totalFixedCosts)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Produção Mínima</p>
                    <p className="text-lg font-bold">{((totalFixedCosts / 0.35) / 25).toFixed(0)} kg</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Dias de Operação</p>
                    <p className="text-lg font-bold">22 dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
