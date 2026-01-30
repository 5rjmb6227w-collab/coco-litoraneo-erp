import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  BarChart3,
  PieChart,
  Users,
  Package,
  Star
} from "lucide-react";

export default function DashboardQualidade() {
  const [period, setPeriod] = useState("30");
  
  const { data: producers } = trpc.producers.list.useQuery();
  const { data: qualityAnalyses } = trpc.quality.analyses.list.useQuery({});
  
  // Mock data para demonstração
  const qualityMetrics = {
    oeeGeral: 78.5,
    oeeTarget: 85,
    disponibilidade: 92.3,
    performance: 85.1,
    qualidade: 99.8,
    ncsAbertas: 3,
    ncsFechadas: 12,
    aprovacaoRate: 98.2,
  };
  
  const gradeDistribution = [
    { grade: "A", count: 156, percentage: 65, color: "from-green-500 to-emerald-600" },
    { grade: "B", count: 67, percentage: 28, color: "from-yellow-500 to-amber-600" },
    { grade: "C", count: 17, percentage: 7, color: "from-red-500 to-rose-600" },
  ];
  
  const topProducers = [
    { name: "João Silva", score: 98.5, loads: 45, trend: "up" },
    { name: "Maria Santos", score: 97.2, loads: 38, trend: "up" },
    { name: "Pedro Oliveira", score: 95.8, loads: 42, trend: "down" },
    { name: "Ana Costa", score: 94.1, loads: 31, trend: "up" },
    { name: "Carlos Souza", score: 92.7, loads: 28, trend: "stable" },
  ];
  
  const productQuality = [
    { name: "Água de Coco 500ml", oee: 82.3, defects: 0.2, batches: 45 },
    { name: "Água de Coco 1L", oee: 79.8, defects: 0.3, batches: 32 },
    { name: "Polpa de Coco", oee: 76.5, defects: 0.5, batches: 28 },
    { name: "Coco Ralado", oee: 74.2, defects: 0.8, batches: 21 },
  ];
  
  const getOEEColor = (value: number) => {
    if (value >= 85) return "text-green-400";
    if (value >= 70) return "text-yellow-400";
    return "text-red-400";
  };
  
  const getOEEBg = (value: number) => {
    if (value >= 85) return "from-green-500/20 to-emerald-500/10";
    if (value >= 70) return "from-yellow-500/20 to-amber-500/10";
    return "from-red-500/20 to-rose-500/10";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Qualidade</h1>
            <p className="text-muted-foreground">
              Métricas de qualidade, OEE e desempenho de produtores
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* OEE Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* OEE Geral */}
          <Card className={`bg-gradient-to-br ${getOEEBg(qualityMetrics.oeeGeral)} border-slate-700`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Target className="h-4 w-4" />
                OEE Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-bold ${getOEEColor(qualityMetrics.oeeGeral)}`}>
                  {qualityMetrics.oeeGeral}%
                </span>
                <span className="text-sm text-muted-foreground mb-1">
                  / {qualityMetrics.oeeTarget}% meta
                </span>
              </div>
              <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r ${
                    qualityMetrics.oeeGeral >= 85 ? 'from-green-500 to-emerald-400' :
                    qualityMetrics.oeeGeral >= 70 ? 'from-yellow-500 to-amber-400' :
                    'from-red-500 to-rose-400'
                  }`}
                  style={{ width: `${(qualityMetrics.oeeGeral / 100) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Disponibilidade */}
          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-300">Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{qualityMetrics.disponibilidade}%</div>
              <p className="text-sm text-muted-foreground mt-1">Tempo produtivo</p>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-300">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{qualityMetrics.performance}%</div>
              <p className="text-sm text-muted-foreground mt-1">Velocidade real vs teórica</p>
            </CardContent>
          </Card>

          {/* Qualidade */}
          <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Qualidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{qualityMetrics.qualidade}%</div>
              <p className="text-sm text-muted-foreground mt-1">Produtos conformes</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Grade Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-cyan-400" />
                Distribuição por Grau
              </CardTitle>
              <CardDescription>Classificação de qualidade das cargas recebidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gradeDistribution.map((item) => (
                  <div key={item.grade} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`bg-gradient-to-r ${item.color} text-white border-0 text-lg px-3 py-1`}>
                          {item.grade}
                        </Badge>
                        <span className="font-medium">{item.count} cargas</span>
                      </div>
                      <span className="text-lg font-bold">{item.percentage}%</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total de cargas analisadas</span>
                  <span className="font-semibold">{gradeDistribution.reduce((a, b) => a + b.count, 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Producers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-400" />
                Ranking de Produtores
              </CardTitle>
              <CardDescription>Score de qualidade por produtor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProducers.map((producer, index) => (
                  <div 
                    key={producer.name}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      index === 1 ? 'bg-slate-400/20 text-slate-300' :
                      index === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{producer.name}</p>
                      <p className="text-sm text-muted-foreground">{producer.loads} cargas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-4 w-4 ${
                              i < Math.floor(producer.score / 20) 
                                ? 'text-yellow-400 fill-yellow-400' 
                                : 'text-slate-600'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className={`font-bold ${
                        producer.score >= 95 ? 'text-green-400' :
                        producer.score >= 90 ? 'text-yellow-400' :
                        'text-orange-400'
                      }`}>
                        {producer.score}
                      </span>
                      {producer.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-400" />}
                      {producer.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Product Quality */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                OEE por Produto
              </CardTitle>
              <CardDescription>Eficiência global por linha de produto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {productQuality.map((product) => (
                  <Card key={product.name} className="bg-slate-800/30 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <Package className="h-5 w-5 text-cyan-400" />
                        <Badge variant="outline" className="text-xs">
                          {product.batches} lotes
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-2">{product.name}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">OEE</span>
                          <span className={`font-bold ${getOEEColor(product.oee)}`}>
                            {product.oee}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              product.oee >= 85 ? 'bg-green-500' :
                              product.oee >= 70 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${product.oee}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Defeitos</span>
                          <span className={`font-medium ${
                            product.defects <= 0.3 ? 'text-green-400' :
                            product.defects <= 0.5 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {product.defects}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* NCs Summary */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Não Conformidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/30">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <XCircle className="h-5 w-5" />
                    <span className="font-medium">Abertas</span>
                  </div>
                  <p className="text-3xl font-bold text-red-400">{qualityMetrics.ncsAbertas}</p>
                </div>
                <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Fechadas</span>
                  </div>
                  <p className="text-3xl font-bold text-green-400">{qualityMetrics.ncsFechadas}</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Target className="h-5 w-5" />
                    <span className="font-medium">Taxa de Aprovação</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-400">{qualityMetrics.aprovacaoRate}%</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Produtores Ativos</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-400">{producers?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
