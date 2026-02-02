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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Truck,
  Receipt,
  Calculator,
  Search,
  Filter,
  MoreHorizontal,
  Percent,
  DollarSign,
  Map,
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

const regions = [
  { value: "norte", label: "Norte", states: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"] },
  { value: "nordeste", label: "Nordeste", states: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  { value: "centro_oeste", label: "Centro-Oeste", states: ["DF", "GO", "MS", "MT"] },
  { value: "sudeste", label: "Sudeste", states: ["ES", "MG", "RJ", "SP"] },
  { value: "sul", label: "Sul", states: ["PR", "RS", "SC"] },
] as const;

type Region = typeof regions[number]["value"];

const brazilianStates = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AM", name: "Amazonas" },
  { uf: "AP", name: "Amapá" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" }, { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" }, { uf: "MG", name: "Minas Gerais" }, { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MT", name: "Mato Grosso" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" },
  { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" }, { uf: "PR", name: "Paraná" },
  { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" }, { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" }, { uf: "RS", name: "Rio Grande do Sul" }, { uf: "SC", name: "Santa Catarina" },
  { uf: "SE", name: "Sergipe" }, { uf: "SP", name: "São Paulo" }, { uf: "TO", name: "Tocantins" },
];

export default function CustoDestinos() {
  const [showModal, setShowModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Calculator state
  const [calcData, setCalcData] = useState({
    destinationId: "",
    weight: "",
    value: "",
  });
  const [calcResult, setCalcResult] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    state: "",
    city: "",
    region: "nordeste" as Region,
    freightType: "valor_fixo" as "valor_fixo" | "formula",
    freightFixedValue: "",
    freightFormula: "",
    freightFormulaDescription: "",
    taxType: "formula" as "valor_fixo" | "formula",
    taxFixedValue: "",
    taxFormula: "",
    taxFormulaDescription: "",
    icmsPercent: "0",
    icmsStPercent: "0",
    pisPercent: "1.65",
    cofinsPercent: "7.60",
    ipiPercent: "0",
  });

  // Queries
  const { data: destinations, isLoading, refetch } = trpc.costs.destinations.list.useQuery({
    status: filterStatus === "all" ? undefined : filterStatus as "ativo" | "inativo",
    region: filterRegion === "all" ? undefined : filterRegion as Region,
  });

  // Mutations
  const utils = trpc.useUtils();

  const createMutation = trpc.costs.destinations.create.useMutation({
    onSuccess: () => {
      toast.success("Destino criado com sucesso!");
      setShowModal(false);
      resetForm();
      utils.costs.destinations.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao criar destino: ${error.message}`);
    },
  });

  const updateMutation = trpc.costs.destinations.update.useMutation({
    onSuccess: () => {
      toast.success("Destino atualizado com sucesso!");
      setShowModal(false);
      setEditingDestination(null);
      resetForm();
      utils.costs.destinations.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar destino: ${error.message}`);
    },
  });

  const deleteMutation = trpc.costs.destinations.delete.useMutation({
    onSuccess: () => {
      toast.success("Destino excluído com sucesso!");
      setDeleteConfirm(null);
      utils.costs.destinations.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir destino: ${error.message}`);
    },
  });

  const { data: calculatedCost, refetch: calculateCost } = trpc.costs.destinations.calculate.useQuery(
    {
      destinationId: parseInt(calcData.destinationId) || 0,
      weight: parseFloat(calcData.weight) || 0,
      value: parseFloat(calcData.value) || 0,
    },
    { enabled: false }
  );

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      state: "",
      city: "",
      region: "nordeste",
      freightType: "valor_fixo",
      freightFixedValue: "",
      freightFormula: "",
      freightFormulaDescription: "",
      taxType: "formula",
      taxFixedValue: "",
      taxFormula: "",
      taxFormulaDescription: "",
      icmsPercent: "0",
      icmsStPercent: "0",
      pisPercent: "1.65",
      cofinsPercent: "7.60",
      ipiPercent: "0",
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setEditingDestination(null);
    setShowModal(true);
  };

  const handleOpenEdit = (destination: any) => {
    setEditingDestination(destination);
    setFormData({
      code: destination.code,
      name: destination.name,
      state: destination.state,
      city: destination.city || "",
      region: destination.region,
      freightType: destination.freightType,
      freightFixedValue: destination.freightFixedValue || "",
      freightFormula: destination.freightFormula || "",
      freightFormulaDescription: destination.freightFormulaDescription || "",
      taxType: destination.taxType,
      taxFixedValue: destination.taxFixedValue || "",
      taxFormula: destination.taxFormula || "",
      taxFormulaDescription: destination.taxFormulaDescription || "",
      icmsPercent: destination.icmsPercent || "0",
      icmsStPercent: destination.icmsStPercent || "0",
      pisPercent: destination.pisPercent || "1.65",
      cofinsPercent: destination.cofinsPercent || "7.60",
      ipiPercent: destination.ipiPercent || "0",
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name || !formData.state) {
      toast.error("Preencha os campos obrigatórios (código, nome e estado)");
      return;
    }

    const data = {
      code: formData.code,
      name: formData.name,
      state: formData.state,
      city: formData.city || undefined,
      region: formData.region,
      freightType: formData.freightType,
      freightFixedValue: parseFloat(formData.freightFixedValue) || 0,
      freightFormula: formData.freightFormula || undefined,
      freightFormulaDescription: formData.freightFormulaDescription || undefined,
      taxType: formData.taxType,
      taxFixedValue: parseFloat(formData.taxFixedValue) || 0,
      taxFormula: formData.taxFormula || undefined,
      taxFormulaDescription: formData.taxFormulaDescription || undefined,
      icmsPercent: parseFloat(formData.icmsPercent) || 0,
      icmsStPercent: parseFloat(formData.icmsStPercent) || 0,
      pisPercent: parseFloat(formData.pisPercent) || 1.65,
      cofinsPercent: parseFloat(formData.cofinsPercent) || 7.60,
      ipiPercent: parseFloat(formData.ipiPercent) || 0,
    };

    if (editingDestination) {
      updateMutation.mutate({ id: editingDestination.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleStatus = (destination: any) => {
    updateMutation.mutate({
      id: destination.id,
      status: destination.status === "ativo" ? "inativo" : "ativo",
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleCalculate = async () => {
    if (!calcData.destinationId || !calcData.weight || !calcData.value) {
      toast.error("Preencha todos os campos para calcular");
      return;
    }
    const result = await calculateCost();
    setCalcResult(result.data);
  };

  const getRegionInfo = (region: string) => {
    return regions.find(r => r.value === region) || regions[1];
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

  // Filter destinations by search term
  const filteredDestinations = destinations?.filter(dest => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      dest.code.toLowerCase().includes(search) ||
      dest.name.toLowerCase().includes(search) ||
      dest.state.toLowerCase().includes(search) ||
      (dest.city && dest.city.toLowerCase().includes(search))
    );
  });

  // Stats
  const totalDestinations = destinations?.length || 0;
  const activeDestinations = destinations?.filter(d => d.status === "ativo").length || 0;
  const destinationsByRegion = regions.map(region => ({
    ...region,
    count: destinations?.filter(d => d.region === region.value).length || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-7 w-7 text-primary" />
            Destinos de Frete e Impostos
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure os custos de frete e impostos por destino de venda
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCalculator(true)} className="gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Destino
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalDestinations}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{activeDestinations}</div>
            <p className="text-xs text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        {destinationsByRegion.map(region => (
          <Card key={region.value}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{region.count}</div>
              <p className="text-xs text-muted-foreground">{region.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nome, estado ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterRegion} onValueChange={setFilterRegion}>
                <SelectTrigger className="w-[160px]">
                  <Map className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Regiões</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Destinos</CardTitle>
          <CardDescription>
            {filteredDestinations?.length || 0} destino(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredDestinations && filteredDestinations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Frete</TableHead>
                  <TableHead>ICMS</TableHead>
                  <TableHead>PIS/COFINS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDestinations.map((dest) => {
                  const regionInfo = getRegionInfo(dest.region);
                  return (
                    <TableRow key={dest.id}>
                      <TableCell className="font-mono font-medium">
                        {dest.code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dest.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {dest.city ? `${dest.city} - ` : ""}{dest.state}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{regionInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {dest.freightType === "valor_fixo" ? (
                          <span className="font-mono">{formatCurrency(dest.freightFixedValue)}</span>
                        ) : (
                          <Badge variant="secondary">Fórmula</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatPercent(dest.icmsPercent)}
                        {parseFloat(dest.icmsStPercent || "0") > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            +{formatPercent(dest.icmsStPercent)} ST
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatPercent(dest.pisPercent)} / {formatPercent(dest.cofinsPercent)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dest.status === "ativo" ? "default" : "secondary"}>
                          {dest.status === "ativo" ? "Ativo" : "Inativo"}
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
                            <DropdownMenuItem onClick={() => handleOpenEdit(dest)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(dest)}>
                              {dest.status === "ativo" ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteConfirm(dest.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
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
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum destino encontrado</p>
              <Button variant="link" onClick={handleOpenCreate}>
                Criar primeiro destino
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDestination ? "Editar Destino" : "Novo Destino"}
            </DialogTitle>
            <DialogDescription>
              Configure os custos de frete e impostos para este destino
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="frete">Frete</TabsTrigger>
              <TabsTrigger value="impostos">Impostos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    placeholder="Ex: SP-CAP"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Região *</Label>
                  <Select 
                    value={formData.region} 
                    onValueChange={(value: Region) => setFormData({ ...formData, region: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map(region => (
                        <SelectItem key={region.value} value={region.value}>
                          {region.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Destino *</Label>
                <Input
                  id="name"
                  placeholder="Ex: São Paulo - Capital"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">Estado (UF) *</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map(state => (
                        <SelectItem key={state.uf} value={state.uf}>
                          {state.uf} - {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Ex: São Paulo"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="frete" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipo de Cálculo do Frete</Label>
                <Select 
                  value={formData.freightType} 
                  onValueChange={(value: "valor_fixo" | "formula") => setFormData({ ...formData, freightType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valor_fixo">Valor Fixo</SelectItem>
                    <SelectItem value="formula">Fórmula</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.freightType === "valor_fixo" ? (
                <div className="space-y-2">
                  <Label htmlFor="freightFixedValue">Valor Fixo do Frete (R$)</Label>
                  <Input
                    id="freightFixedValue"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formData.freightFixedValue}
                    onChange={(e) => setFormData({ ...formData, freightFixedValue: e.target.value })}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="freightFormula">Fórmula do Frete</Label>
                    <Input
                      id="freightFormula"
                      placeholder="Ex: peso * 2.5 + 50"
                      value={formData.freightFormula}
                      onChange={(e) => setFormData({ ...formData, freightFormula: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variáveis disponíveis: peso, valor. Ex: "peso * 2.5" ou "valor * 0.05 + 100"
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freightFormulaDescription">Descrição da Fórmula</Label>
                    <Input
                      id="freightFormulaDescription"
                      placeholder="Ex: R$ 2,50 por kg + R$ 50 fixo"
                      value={formData.freightFormulaDescription}
                      onChange={(e) => setFormData({ ...formData, freightFormulaDescription: e.target.value })}
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="impostos" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icmsPercent">ICMS (%)</Label>
                  <Input
                    id="icmsPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={formData.icmsPercent}
                    onChange={(e) => setFormData({ ...formData, icmsPercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icmsStPercent">ICMS-ST (%)</Label>
                  <Input
                    id="icmsStPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={formData.icmsStPercent}
                    onChange={(e) => setFormData({ ...formData, icmsStPercent: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pisPercent">PIS (%)</Label>
                  <Input
                    id="pisPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="1.65"
                    value={formData.pisPercent}
                    onChange={(e) => setFormData({ ...formData, pisPercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cofinsPercent">COFINS (%)</Label>
                  <Input
                    id="cofinsPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="7.60"
                    value={formData.cofinsPercent}
                    onChange={(e) => setFormData({ ...formData, cofinsPercent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ipiPercent">IPI (%)</Label>
                  <Input
                    id="ipiPercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={formData.ipiPercent}
                    onChange={(e) => setFormData({ ...formData, ipiPercent: e.target.value })}
                  />
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Carga Tributária Total</p>
                <p className="text-2xl font-bold text-primary">
                  {formatPercent(
                    (parseFloat(formData.icmsPercent) || 0) +
                    (parseFloat(formData.icmsStPercent) || 0) +
                    (parseFloat(formData.pisPercent) || 0) +
                    (parseFloat(formData.cofinsPercent) || 0) +
                    (parseFloat(formData.ipiPercent) || 0)
                  )}
                </p>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calculator Modal */}
      <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadora de Frete e Impostos
            </DialogTitle>
            <DialogDescription>
              Simule os custos de frete e impostos para um destino específico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Destino</Label>
              <Select 
                value={calcData.destinationId} 
                onValueChange={(value) => setCalcData({ ...calcData, destinationId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um destino" />
                </SelectTrigger>
                <SelectContent>
                  {destinations?.filter(d => d.status === "ativo").map(dest => (
                    <SelectItem key={dest.id} value={dest.id.toString()}>
                      {dest.code} - {dest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calcWeight">Peso (kg)</Label>
                <Input
                  id="calcWeight"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={calcData.weight}
                  onChange={(e) => setCalcData({ ...calcData, weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calcValue">Valor (R$)</Label>
                <Input
                  id="calcValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={calcData.value}
                  onChange={(e) => setCalcData({ ...calcData, value: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleCalculate} className="w-full">
              Calcular
            </Button>

            {calcResult && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Destino:</span>
                  <span className="font-medium">{calcResult.destinationName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm flex items-center gap-1">
                    <Truck className="h-4 w-4" /> Frete:
                  </span>
                  <span className="font-mono font-medium">{formatCurrency(calcResult.freightCost)}</span>
                </div>
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>ICMS:</span>
                    <span className="font-mono">{formatCurrency(calcResult.taxes.icms)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>ICMS-ST:</span>
                    <span className="font-mono">{formatCurrency(calcResult.taxes.icmsSt)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>PIS:</span>
                    <span className="font-mono">{formatCurrency(calcResult.taxes.pis)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>COFINS:</span>
                    <span className="font-mono">{formatCurrency(calcResult.taxes.cofins)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>IPI:</span>
                    <span className="font-mono">{formatCurrency(calcResult.taxes.ipi)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm flex items-center gap-1">
                    <Receipt className="h-4 w-4" /> Total Impostos:
                  </span>
                  <span className="font-mono font-medium">{formatCurrency(calcResult.taxes.total)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="font-medium">Custo Total:</span>
                  <span className="font-mono font-bold text-lg text-primary">
                    {formatCurrency(calcResult.totalCost)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este destino? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
