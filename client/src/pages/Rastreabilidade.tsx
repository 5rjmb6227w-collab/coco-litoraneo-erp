import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Search, 
  Package, 
  Truck, 
  Factory, 
  Box,
  ArrowRight,
  QrCode,
  FileText,
  Calendar,
  MapPin,
  User,
  Leaf,
  Download,
  ChevronRight
} from "lucide-react";

export default function Rastreabilidade() {
  const [searchCode, setSearchCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");
  
  const { data: traceability, isLoading, refetch } = trpc.batches.getTraceability.useQuery(
    { batchCode: searchedCode },
    { enabled: !!searchedCode }
  );
  
  const handleSearch = () => {
    if (!searchCode.trim()) {
      toast.error("Digite um código de lote para buscar");
      return;
    }
    setSearchedCode(searchCode.trim());
  };
  
  const getNodeIcon = (type: string) => {
    const icons: Record<string, any> = {
      materia_prima: Leaf,
      carga: Truck,
      producao: Factory,
      lote: Box,
      expedicao: Package,
    };
    return icons[type] || Package;
  };
  
  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      materia_prima: "from-green-500 to-emerald-600",
      carga: "from-blue-500 to-cyan-600",
      producao: "from-yellow-500 to-orange-600",
      lote: "from-purple-500 to-violet-600",
      expedicao: "from-pink-500 to-rose-600",
    };
    return colors[type] || "from-slate-500 to-slate-600";
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      disponivel: "bg-green-500/20 text-green-400 border-green-500/30",
      quarentena: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      em_producao: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      expedido: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      vencido: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rastreabilidade</h1>
          <p className="text-muted-foreground">
            Rastreie a cadeia completa de produção de qualquer lote
          </p>
        </div>

        {/* Search */}
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Digite o código do lote (ex: LT-2026-001)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-12 h-12 text-lg"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isLoading}
                className="h-12 px-8 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600"
              >
                <Search className="mr-2 h-5 w-5" />
                {isLoading ? "Buscando..." : "Rastrear"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {searchedCode && !isLoading && (
          traceability ? (
            <div className="space-y-6">
              {/* Batch Info Card */}
              <Card className="bg-gradient-to-br from-purple-900/30 to-violet-900/20 border-purple-700/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Box className="h-6 w-6 text-purple-400" />
                        Lote {traceability.code}
                      </CardTitle>
                      <CardDescription className="text-lg mt-1">
                        {traceability.sku}
                      </CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(traceability.status)} border text-sm px-3 py-1`}>
                      {traceability.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                      <Package className="h-5 w-5 text-cyan-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">Quantidade</p>
                        <p className="font-semibold">{traceability.quantity} kg</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                      <Calendar className="h-5 w-5 text-green-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">Produção</p>
                        <p className="font-semibold">
                          {new Date(traceability.productionDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                      <Calendar className="h-5 w-5 text-orange-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">Validade</p>
                        <p className="font-semibold">
                          {new Date(traceability.expirationDate).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">Etapas</p>
                        <p className="font-semibold">{traceability.children?.length || 0} registros</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Traceability Chain */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-cyan-400" />
                    Cadeia de Rastreabilidade
                  </CardTitle>
                  <CardDescription>
                    Histórico completo desde a matéria-prima até o produto final
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {traceability.children && traceability.children.length > 0 ? (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-yellow-500 to-purple-500" />
                      
                      <div className="space-y-6">
                        {traceability.children.map((node: any, index: number) => {
                          const NodeIcon = getNodeIcon(node.type);
                          const nodeColor = getNodeColor(node.type);
                          
                          return (
                            <div key={index} className="relative flex items-start gap-4 pl-2">
                              {/* Node icon */}
                              <div className={`relative z-10 p-2 rounded-full bg-gradient-to-br ${nodeColor} shadow-lg`}>
                                <NodeIcon className="h-5 w-5 text-white" />
                              </div>
                              
                              {/* Node content */}
                              <Card className="flex-1 bg-slate-800/30 border-slate-700 hover:border-slate-600 transition-colors">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-semibold text-white">{node.name}</h4>
                                      <p className="text-sm text-muted-foreground capitalize">
                                        {node.type.replace('_', ' ')}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      {node.quantity && (
                                        <p className="font-medium">
                                          {node.quantity} {node.unit || 'kg'}
                                        </p>
                                      )}
                                      {node.date && (
                                        <p className="text-sm text-muted-foreground">
                                          {new Date(node.date).toLocaleDateString('pt-BR')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {node.metadata && (
                                    <div className="mt-3 pt-3 border-t border-slate-700">
                                      <div className="flex flex-wrap gap-2">
                                        {Object.entries(node.metadata).map(([key, value]: [string, any]) => (
                                          <Badge key={key} variant="outline" className="text-xs">
                                            {key}: {String(value)}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Nenhum registro de rastreabilidade encontrado para este lote.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Os registros são adicionados automaticamente durante o processo de produção.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <Button variant="outline">
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar QR Code
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Lote não encontrado</h3>
                <p className="text-muted-foreground text-center">
                  Não foi possível encontrar o lote com o código "{searchedCode}".
                  <br />
                  Verifique se o código está correto e tente novamente.
                </p>
              </CardContent>
            </Card>
          )
        )}

        {/* Empty State */}
        {!searchedCode && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 mb-6">
                <QrCode className="h-12 w-12 text-cyan-400" />
              </div>
              <h3 className="text-xl font-medium mb-2">Rastreie qualquer lote</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Digite o código do lote acima para visualizar toda a cadeia de produção,
                desde a matéria-prima até o produto final.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => setSearchCode("LT-2026-001")}>
                  LT-2026-001
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => setSearchCode("LT-2026-002")}>
                  LT-2026-002
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-slate-800" onClick={() => setSearchCode("LT-2026-003")}>
                  LT-2026-003
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
