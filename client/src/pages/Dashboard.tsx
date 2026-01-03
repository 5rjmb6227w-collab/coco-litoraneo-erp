import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Package, Truck, Users, Wallet, AlertTriangle, Archive } from "lucide-react";
import { useEffect } from "react";

export default function Dashboard() {
  // Run seeds on first load
  const seedMutation = trpc.seed.runAll.useMutation();
  
  useEffect(() => {
    seedMutation.mutate();
  }, []);

  // Fetch data for dashboard cards
  const { data: producers } = trpc.producers.list.useQuery({ status: "ativo" });
  const { data: loads } = trpc.coconutLoads.list.useQuery({});
  const { data: payables } = trpc.producerPayables.list.useQuery({});
  const { data: warehouseItems } = trpc.warehouseItems.list.useQuery({ warehouseType: "producao", belowMinimum: true });
  const { data: skus } = trpc.skus.list.useQuery({ belowMinimum: true });

  const pendingPayables = payables?.filter(p => p.status === "pendente" || p.status === "aprovado") || [];
  const totalPending = pendingPayables.reduce((acc, p) => acc + Number(p.totalValue), 0);
  
  const openLoads = loads?.filter(l => l.status !== "fechado") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema Coco Litorâneo</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{producers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Fornecedores cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cargas Abertas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openLoads.length}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando fechamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar Produtores</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingPayables.length} pagamentos pendentes
            </p>
          </CardContent>
        </Card>

        <Card className={warehouseItems && warehouseItems.length > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insumos Críticos</CardTitle>
            <Package className={`h-4 w-4 ${warehouseItems && warehouseItems.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouseItems?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Abaixo do estoque mínimo
            </p>
          </CardContent>
        </Card>

        <Card className={skus && skus.length > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SKUs Críticos</CardTitle>
            <Archive className={`h-4 w-4 ${skus && skus.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skus?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Produto acabado abaixo do mínimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cargas</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loads?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Cargas registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {((warehouseItems && warehouseItems.length > 0) || (skus && skus.length > 0)) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warehouseItems?.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.name}</span>
                <span className="text-destructive font-medium">
                  {Number(item.currentStock).toFixed(0)} / {Number(item.minimumStock).toFixed(0)} {item.unit}
                </span>
              </div>
            ))}
            {skus?.map(sku => (
              <div key={sku.id} className="flex items-center justify-between text-sm">
                <span>{sku.description}</span>
                <span className="text-destructive font-medium">
                  {Number(sku.currentStock).toFixed(0)} / {Number(sku.minimumStock).toFixed(0)} kg
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mensagem de boas-vindas */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <span className="text-4xl">🥥</span>
            <h2 className="text-lg font-semibold">Bem-vindo ao Sistema Coco Litorâneo</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Use o menu lateral para navegar entre os módulos do sistema. 
              O Dashboard completo com gráficos e indicadores será implementado na Tarefa 4.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
