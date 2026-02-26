import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, AlertTriangle, Package, Box, Layers, BarChart3, Wrench } from "lucide-react";

export default function EstoqueReconciliacao() {
  const [activeTab, setActiveTab] = useState<"overview" | "warehouse" | "skus" | "batches">("overview");

  const fullReport = trpc.stockReconciliation.fullReport.useQuery();
  const warehouseCheck = trpc.stockReconciliation.checkWarehouseItems.useQuery(undefined, { enabled: activeTab === "warehouse" || activeTab === "overview" });
  const skuCheck = trpc.stockReconciliation.checkSkus.useQuery(undefined, { enabled: activeTab === "skus" || activeTab === "overview" });
  const batchCheck = trpc.stockReconciliation.checkBatches.useQuery(undefined, { enabled: activeTab === "batches" || activeTab === "overview" });

  const fixWarehouseMutation = trpc.stockReconciliation.fixWarehouseItems.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.fixed} item(ns) de almoxarifado corrigido(s)`);
      warehouseCheck.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const fixSkusMutation = trpc.stockReconciliation.fixSkus.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.fixed} SKU(s) corrigido(s)`);
      skuCheck.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const totalDivergences = (warehouseCheck.data?.totalDivergences || 0) + (skuCheck.data?.totalDivergences || 0) + (batchCheck.data?.totalDivergences || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reconciliação de Estoque</h1>
        <p className="text-muted-foreground">Verificação e correção de divergências entre saldo cacheado e movimentações reais</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { key: "overview", label: "Visão Geral", icon: BarChart3 },
          { key: "warehouse", label: "Almoxarifado", icon: Package },
          { key: "skus", label: "SKUs", icon: Box },
          { key: "batches", label: "Lotes", icon: Layers },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(key as typeof activeTab)}
          >
            <Icon className="w-4 h-4 mr-1" />
            {label}
          </Button>
        ))}
      </div>

      {/* VISÃO GERAL */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Itens Almoxarifado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fullReport.data?.summary.warehouseItems || 0}</div>
                <p className="text-xs text-muted-foreground">{fullReport.data?.summary.warehouseMovements || 0} movimentações</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">SKUs Produto Acabado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fullReport.data?.summary.skus || 0}</div>
                <p className="text-xs text-muted-foreground">{fullReport.data?.summary.activeBatches || 0} lotes ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Movimentações Lotes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fullReport.data?.summary.batchMovements || 0}</div>
                <p className="text-xs text-muted-foreground">Total registradas</p>
              </CardContent>
            </Card>
            <Card className={totalDivergences > 0 ? "border-destructive" : "border-green-500"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Divergências</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalDivergences > 0 ? "text-destructive" : "text-green-600"}`}>
                  {totalDivergences}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalDivergences === 0 ? "Tudo em ordem" : "Requer atenção"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status por categoria */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Almoxarifado</CardTitle>
                  {warehouseCheck.data?.totalDivergences === 0 ? (
                    <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>
                  ) : (
                    <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{warehouseCheck.data?.totalDivergences} divergência(s)</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {warehouseCheck.data?.totalItems || 0} itens verificados
                </p>
                {(warehouseCheck.data?.totalDivergences || 0) > 0 && (
                  <Button size="sm" className="mt-2" onClick={() => fixWarehouseMutation.mutate({})}>
                    <Wrench className="w-3 h-3 mr-1" />Corrigir
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">SKUs</CardTitle>
                  {skuCheck.data?.totalDivergences === 0 ? (
                    <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>
                  ) : (
                    <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{skuCheck.data?.totalDivergences} divergência(s)</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {skuCheck.data?.totalSkus || 0} SKUs verificados
                </p>
                {(skuCheck.data?.totalDivergences || 0) > 0 && (
                  <Button size="sm" className="mt-2" onClick={() => fixSkusMutation.mutate({})}>
                    <Wrench className="w-3 h-3 mr-1" />Corrigir
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Lotes</CardTitle>
                  {batchCheck.data?.totalDivergences === 0 ? (
                    <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>
                  ) : (
                    <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{batchCheck.data?.totalDivergences} divergência(s)</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {batchCheck.data?.totalBatches || 0} lotes verificados
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { warehouseCheck.refetch(); skuCheck.refetch(); batchCheck.refetch(); fullReport.refetch(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />Verificar Novamente
            </Button>
          </div>
        </div>
      )}

      {/* ALMOXARIFADO */}
      {activeTab === "warehouse" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Divergências — Almoxarifado</CardTitle>
                <CardDescription>{warehouseCheck.data?.totalItems || 0} itens verificados, {warehouseCheck.data?.totalDivergences || 0} divergência(s)</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => warehouseCheck.refetch()}>
                  <RefreshCw className="w-4 h-4 mr-1" />Verificar
                </Button>
                {(warehouseCheck.data?.totalDivergences || 0) > 0 && (
                  <Button size="sm" onClick={() => fixWarehouseMutation.mutate({})}>
                    <Wrench className="w-4 h-4 mr-1" />Corrigir Todos
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {warehouseCheck.data?.divergences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Nenhuma divergência encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Saldo Cache</TableHead>
                    <TableHead className="text-right">Saldo Real</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouseCheck.data?.divergences.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono">{d.code}</TableCell>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.unit}</TableCell>
                      <TableCell className="text-right">{d.cachedStock.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{d.calculatedStock.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-bold ${d.difference > 0 ? "text-red-600" : "text-blue-600"}`}>
                        {d.difference > 0 ? "+" : ""}{d.difference.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => fixWarehouseMutation.mutate({ itemIds: [d.id] })}>
                          Corrigir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* SKUs */}
      {activeTab === "skus" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Divergências — SKUs</CardTitle>
                <CardDescription>{skuCheck.data?.totalSkus || 0} SKUs verificados, {skuCheck.data?.totalDivergences || 0} divergência(s)</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => skuCheck.refetch()}>
                  <RefreshCw className="w-4 h-4 mr-1" />Verificar
                </Button>
                {(skuCheck.data?.totalDivergences || 0) > 0 && (
                  <Button size="sm" onClick={() => fixSkusMutation.mutate({})}>
                    <Wrench className="w-4 h-4 mr-1" />Corrigir Todos
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {skuCheck.data?.divergences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Nenhuma divergência encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Saldo Cache</TableHead>
                    <TableHead className="text-right">Soma Lotes</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skuCheck.data?.divergences.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono">{d.code}</TableCell>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.unit}</TableCell>
                      <TableCell className="text-right">{d.cachedStock.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{d.calculatedFromBatches.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-bold ${d.difference > 0 ? "text-red-600" : "text-blue-600"}`}>
                        {d.difference > 0 ? "+" : ""}{d.difference.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => fixSkusMutation.mutate({ skuIds: [d.id] })}>
                          Corrigir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* LOTES */}
      {activeTab === "batches" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Divergências — Lotes</CardTitle>
                <CardDescription>{batchCheck.data?.totalBatches || 0} lotes verificados, {batchCheck.data?.totalDivergences || 0} divergência(s)</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => batchCheck.refetch()}>
                <RefreshCw className="w-4 h-4 mr-1" />Verificar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {batchCheck.data?.divergences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Nenhuma divergência encontrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Qtd Cache</TableHead>
                    <TableHead className="text-right">Qtd Real</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchCheck.data?.divergences.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono">{d.code}</TableCell>
                      <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                      <TableCell className="text-right">{d.cachedQuantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{d.calculatedQuantity.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-bold ${d.difference > 0 ? "text-red-600" : "text-blue-600"}`}>
                        {d.difference > 0 ? "+" : ""}{d.difference.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
