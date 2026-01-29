import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy,
  Medal,
  Award,
  Star,
  TrendingUp,
  Calendar,
  Users,
  Scale,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const BAR_COLORS = ['#8B7355', '#A89078', '#C4B4A0', '#D4C4B0', '#E4D4C0'];

type RankingCriteria = "volume" | "qualidade" | "regularidade" | "geral";

export default function RankingProdutores() {
  const [period, setPeriod] = useState("90");
  const [criteria, setCriteria] = useState<RankingCriteria>("geral");

  // Buscar dados
  const { data: producers } = trpc.producers.list.useQuery({ status: "ativo" });
  const { data: loads, isLoading: loadsLoading } = trpc.coconutLoads.list.useQuery({});
  const { data: analyses } = trpc.quality.analyses.list.useQuery({});

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(period));
    return { start, end };
  }, [period]);

  // Calcular ranking
  const ranking = useMemo(() => {
    if (!producers || !loads) return [];

    const producerStats: Record<number, {
      id: number;
      name: string;
      totalVolume: number;
      loadCount: number;
      avgQuality: number;
      qualityCount: number;
      regularityScore: number;
      overallScore: number;
    }> = {};

    // Inicializar produtores
    producers.forEach((p: any) => {
      producerStats[p.id] = {
        id: p.id,
        name: p.name,
        totalVolume: 0,
        loadCount: 0,
        avgQuality: 0,
        qualityCount: 0,
        regularityScore: 0,
        overallScore: 0,
      };
    });

    // Processar cargas
    const loadsByProducer: Record<number, Date[]> = {};
    
    loads.forEach((load: any) => {
      const loadDate = new Date(load.createdAt);
      if (loadDate < dateRange.start || loadDate > dateRange.end) return;
      if (!load.producerId || !producerStats[load.producerId]) return;

      producerStats[load.producerId].totalVolume += Number(load.totalWeight) || 0;
      producerStats[load.producerId].loadCount += 1;

      if (!loadsByProducer[load.producerId]) {
        loadsByProducer[load.producerId] = [];
      }
      loadsByProducer[load.producerId].push(loadDate);
    });

    // Processar análises de qualidade
    if (analyses) {
      analyses.forEach((analysis: any) => {
        const analysisDate = new Date(analysis.createdAt);
        if (analysisDate < dateRange.start || analysisDate > dateRange.end) return;
        
        // Encontrar o produtor pela carga
        const load = loads.find((l: any) => l.id === analysis.loadId);
        if (!load || !load.producerId || !producerStats[load.producerId]) return;

        // Calcular score de qualidade (baseado em conformidade)
        const qualityScore = analysis.status === 'aprovado' ? 100 : 
                           analysis.status === 'aprovado_restricao' ? 70 : 30;
        
        producerStats[load.producerId].avgQuality += qualityScore;
        producerStats[load.producerId].qualityCount += 1;
      });
    }

    // Calcular scores finais
    const maxVolume = Math.max(...Object.values(producerStats).map(p => p.totalVolume), 1);
    const periodDays = parseInt(period);
    
    Object.values(producerStats).forEach(producer => {
      // Média de qualidade
      if (producer.qualityCount > 0) {
        producer.avgQuality = producer.avgQuality / producer.qualityCount;
      } else {
        producer.avgQuality = 50; // Score neutro se não há análises
      }

      // Score de regularidade (entregas por semana esperadas)
      const expectedLoads = periodDays / 7; // 1 entrega por semana
      producer.regularityScore = Math.min(100, (producer.loadCount / expectedLoads) * 100);

      // Score geral (ponderado)
      const volumeScore = (producer.totalVolume / maxVolume) * 100;
      producer.overallScore = (
        volumeScore * 0.4 +
        producer.avgQuality * 0.35 +
        producer.regularityScore * 0.25
      );
    });

    // Ordenar por critério selecionado
    const sorted = Object.values(producerStats)
      .filter(p => p.loadCount > 0)
      .sort((a, b) => {
        switch (criteria) {
          case "volume": return b.totalVolume - a.totalVolume;
          case "qualidade": return b.avgQuality - a.avgQuality;
          case "regularidade": return b.regularityScore - a.regularityScore;
          default: return b.overallScore - a.overallScore;
        }
      });

    return sorted;
  }, [producers, loads, analyses, dateRange, criteria]);

  // Dados para o gráfico
  const chartData = useMemo(() => {
    return ranking.slice(0, 10).map((p, index) => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
      value: criteria === "volume" ? p.totalVolume :
             criteria === "qualidade" ? p.avgQuality :
             criteria === "regularidade" ? p.regularityScore :
             p.overallScore,
      color: BAR_COLORS[index % BAR_COLORS.length],
    }));
  }, [ranking, criteria]);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getMedalIcon = (position: number) => {
    if (position === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (position === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (position === 2) return <Award className="h-6 w-6 text-amber-700" />;
    return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">{position + 1}</span>;
  };

  const getScoreLabel = (criteria: RankingCriteria) => {
    switch (criteria) {
      case "volume": return "Volume (kg)";
      case "qualidade": return "Qualidade (%)";
      case "regularidade": return "Regularidade (%)";
      default: return "Score Geral";
    }
  };

  const getScoreValue = (producer: typeof ranking[0], criteria: RankingCriteria) => {
    switch (criteria) {
      case "volume": return `${formatNumber(producer.totalVolume)} kg`;
      case "qualidade": return `${producer.avgQuality.toFixed(1)}%`;
      case "regularidade": return `${producer.regularityScore.toFixed(1)}%`;
      default: return `${producer.overallScore.toFixed(1)} pts`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Ranking de Produtores
          </h1>
          <p className="text-muted-foreground">
            Classificação dos produtores por desempenho
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={criteria} onValueChange={(v) => setCriteria(v as RankingCriteria)}>
            <SelectTrigger className="w-[180px]">
              <Star className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Critério" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="geral">Score Geral</SelectItem>
              <SelectItem value="volume">Volume Entregue</SelectItem>
              <SelectItem value="qualidade">Qualidade</SelectItem>
              <SelectItem value="regularidade">Regularidade</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ranking.length}</div>
            <p className="text-xs text-muted-foreground">Com entregas no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(ranking.reduce((sum, p) => sum + p.totalVolume, 0))} kg
            </div>
            <p className="text-xs text-muted-foreground">Entregue no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualidade Média</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ranking.length > 0 
                ? (ranking.reduce((sum, p) => sum + p.avgQuality, 0) / ranking.length).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Score médio de qualidade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ranking.reduce((sum, p) => sum + p.loadCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total de cargas</p>
          </CardContent>
        </Card>
      </div>

      {/* Pódio */}
      {ranking.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Pódio - Top 3
            </CardTitle>
            <CardDescription>Os melhores produtores do período por {getScoreLabel(criteria).toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-end gap-4 py-8">
              {/* 2º Lugar */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  <Medal className="h-12 w-12 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold truncate max-w-[120px]">{ranking[1]?.name}</p>
                  <Badge variant="secondary">{getScoreValue(ranking[1], criteria)}</Badge>
                </div>
                <div className="w-24 h-20 bg-gray-200 mt-4 rounded-t-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-500">2º</span>
                </div>
              </div>

              {/* 1º Lugar */}
              <div className="flex flex-col items-center">
                <div className="w-28 h-28 rounded-full bg-yellow-100 flex items-center justify-center mb-2 ring-4 ring-yellow-400">
                  <Trophy className="h-14 w-14 text-yellow-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold truncate max-w-[140px]">{ranking[0]?.name}</p>
                  <Badge className="bg-yellow-500">{getScoreValue(ranking[0], criteria)}</Badge>
                </div>
                <div className="w-28 h-28 bg-yellow-400 mt-4 rounded-t-lg flex items-center justify-center">
                  <span className="text-3xl font-bold text-yellow-800">1º</span>
                </div>
              </div>

              {/* 3º Lugar */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                  <Award className="h-12 w-12 text-amber-700" />
                </div>
                <div className="text-center">
                  <p className="font-semibold truncate max-w-[120px]">{ranking[2]?.name}</p>
                  <Badge variant="outline">{getScoreValue(ranking[2], criteria)}</Badge>
                </div>
                <div className="w-24 h-16 bg-amber-200 mt-4 rounded-t-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-amber-700">3º</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico e Tabela */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Produtores</CardTitle>
            <CardDescription>Por {getScoreLabel(criteria).toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {loadsLoading ? (
                <Skeleton className="h-full w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip 
                      formatter={(value: number) => [
                        criteria === "volume" ? `${formatNumber(value)} kg` : `${value.toFixed(1)}%`,
                        getScoreLabel(criteria)
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela Completa */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking Completo</CardTitle>
            <CardDescription>Todos os produtores com entregas no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto">
              {loadsLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : ranking.length > 0 ? (
                <div className="space-y-2">
                  {ranking.map((producer, index) => (
                    <div 
                      key={producer.id} 
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        index < 3 ? 'bg-accent/50' : 'hover:bg-accent/30'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {getMedalIcon(index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{producer.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{producer.loadCount} cargas</span>
                          <span>•</span>
                          <span>{formatNumber(producer.totalVolume)} kg</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{getScoreValue(producer, criteria)}</p>
                        <Progress 
                          value={
                            criteria === "volume" 
                              ? (producer.totalVolume / (ranking[0]?.totalVolume || 1)) * 100
                              : criteria === "qualidade" ? producer.avgQuality
                              : criteria === "regularidade" ? producer.regularityScore
                              : (producer.overallScore / (ranking[0]?.overallScore || 1)) * 100
                          } 
                          className="h-1 w-20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produtor com entregas no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
