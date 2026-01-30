import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  Package,
  Layers,
  DollarSign,
  Scale,
  AlertTriangle,
  ChevronRight,
  Edit,
  Trash2,
  Calculator,
  FileText
} from "lucide-react";

export default function BOMReceitas() {
  const [search, setSearch] = useState("");
  const [selectedSku, setSelectedSku] = useState<any>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  
  const { data: skus, isLoading: loadingSkus } = trpc.skus.list.useQuery({});
  const { data: warehouseItems } = trpc.warehouseItems.list.useQuery({ warehouseType: "producao" });
  
  // Filtrar SKUs que possuem BOM
  const filteredSkus = skus?.filter((sku: any) => 
    !search || 
    sku.code.toLowerCase().includes(search.toLowerCase()) ||
    sku.description.toLowerCase().includes(search.toLowerCase())
  );

  // Mock BOM data (será substituído por dados reais do backend)
  const mockBOM: Record<number, any[]> = {
    1: [
      { id: 1, itemName: "Coco Verde", quantity: "10", unit: "un", cost: "2.50", available: true },
      { id: 2, itemName: "Água Mineral", quantity: "0.5", unit: "L", cost: "1.20", available: true },
      { id: 3, itemName: "Conservante Natural", quantity: "0.01", unit: "kg", cost: "15.00", available: false },
    ],
    2: [
      { id: 4, itemName: "Polpa de Coco", quantity: "0.5", unit: "kg", cost: "8.00", available: true },
      { id: 5, itemName: "Açúcar", quantity: "0.1", unit: "kg", cost: "3.50", available: true },
    ],
  };
  
  const calculateTotalCost = (items: any[]) => {
    return items.reduce((total, item) => {
      return total + (parseFloat(item.quantity) * parseFloat(item.cost));
    }, 0);
  };
  
  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Item adicionado à receita!");
    setIsAddItemOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">BOM / Receitas</h1>
            <p className="text-muted-foreground">
              Gestão de Bill of Materials e receitas de produção
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto por código ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Products List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-cyan-400" />
              Produtos (SKUs)
            </h2>
            
            {loadingSkus ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-slate-700 rounded w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSkus && filteredSkus.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredSkus.map((sku: any) => {
                  const bomItems = mockBOM[sku.id] || [];
                  const totalCost = calculateTotalCost(bomItems);
                  const hasUnavailable = bomItems.some((item: any) => !item.available);
                  
                  return (
                    <Card 
                      key={sku.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedSku?.id === sku.id 
                          ? 'border-cyan-500 bg-cyan-900/10' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                      onClick={() => setSelectedSku(sku)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{sku.code}</h3>
                              {hasUnavailable && (
                                <AlertTriangle className="h-4 w-4 text-orange-400" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{sku.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Custo</p>
                            <p className="font-semibold text-green-400">
                              R$ {totalCost.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Layers className="h-4 w-4" />
                            {bomItems.length} ingredientes
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Package className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum produto encontrado</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* BOM Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              Receita / BOM
            </h2>
            
            {selectedSku ? (
              <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedSku.code}</CardTitle>
                      <CardDescription>{selectedSku.description}</CardDescription>
                    </div>
                    <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500">
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Ingrediente</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddItem} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Item do Almoxarifado</Label>
                            <Select name="itemId" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o item" />
                              </SelectTrigger>
                              <SelectContent>
                                {warehouseItems?.map((item: any) => (
                                  <SelectItem key={item.id} value={String(item.id)}>
                                    {item.name} ({item.currentStock} {item.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Quantidade</Label>
                              <Input name="quantity" type="number" step="0.001" required />
                            </div>
                            <div className="space-y-2">
                              <Label>Unidade</Label>
                              <Select name="unit" required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Unidade" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">kg</SelectItem>
                                  <SelectItem value="g">g</SelectItem>
                                  <SelectItem value="L">L</SelectItem>
                                  <SelectItem value="mL">mL</SelectItem>
                                  <SelectItem value="un">un</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit">Adicionar</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* BOM Items */}
                  {(mockBOM[selectedSku.id] || []).length > 0 ? (
                    <div className="space-y-3">
                      {(mockBOM[selectedSku.id] || []).map((item: any) => (
                        <div 
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            item.available 
                              ? 'bg-slate-800/50' 
                              : 'bg-red-900/20 border border-red-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              item.available ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              <Package className={`h-4 w-4 ${
                                item.available ? 'text-green-400' : 'text-red-400'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{item.itemName}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit} × R$ {item.cost}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">
                              R$ {(parseFloat(item.quantity) * parseFloat(item.cost)).toFixed(2)}
                            </p>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Nenhum ingrediente cadastrado</p>
                      <p className="text-sm text-muted-foreground">
                        Clique em "Adicionar Item" para começar
                      </p>
                    </div>
                  )}

                  {/* Summary */}
                  {(mockBOM[selectedSku.id] || []).length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-slate-800/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <Calculator className="h-4 w-4" />
                              <span className="text-sm">Custo Total</span>
                            </div>
                            <p className="text-2xl font-bold text-green-400">
                              R$ {calculateTotalCost(mockBOM[selectedSku.id] || []).toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="bg-slate-800/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                              <Scale className="h-4 w-4" />
                              <span className="text-sm">Rendimento</span>
                            </div>
                            <p className="text-2xl font-bold">
                              1 {selectedSku.unit || 'un'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {(mockBOM[selectedSku.id] || []).some((item: any) => !item.available) && (
                        <div className="mt-4 p-3 rounded-lg bg-orange-900/20 border border-orange-500/30 flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-orange-400">Atenção: Itens Indisponíveis</p>
                            <p className="text-sm text-muted-foreground">
                              Alguns ingredientes estão com estoque zerado ou abaixo do necessário.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed h-[400px]">
                <CardContent className="flex flex-col items-center justify-center h-full">
                  <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecione um produto</h3>
                  <p className="text-muted-foreground text-center">
                    Clique em um produto na lista ao lado para visualizar
                    <br />
                    ou editar sua receita/BOM.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
