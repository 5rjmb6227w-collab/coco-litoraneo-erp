import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

export default function HistoricoPrecos() {
  const [period, setPeriod] = useState("90");
  const [selectedProducer, setSelectedProducer] = useState<string>("all");

  // Buscar produtores
  const { data: producers } = trpc.producers.list.useQuery({ status: "ativo" });

  // Buscar cargas para extrair histórico de preços
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(period));
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [period]);

  const { data: loads, isLoading } = trpc.coconutLoads.list.useQuery({});

  // Processar dados para o gráfico de evolução de preços
  const priceEvolutionData = useMemo(() => {
    if (!loads) return [];
    
    const filteredLoads = loads.filter((load: any) => {
      const loadDate = new Date(load.createdAt);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      if (loadDate < startDate || loadDate > endDate) return false;
      if (selectedProducer !== "all" && load.producerId !== parseInt(selectedProducer)) return false;
      
      return true;
    });

    // Agrupar por data
    const groupedByDate: Record<string, { prices: number[]; weights: number[] }> = {};
    
    filteredLoads.forEach((load: any) => {
      const date = new Date(load.createdAt).toISOString().split('T')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = { prices: [], weights: [] };
      }
      if (load.pricePerKg) {
        groupedByDate[date].prices.push(Number(load.pricePerKg));
        groupedByDate[date].weights.push(Number(load.totalWeight) || 0);
      }
    });

    // Calcular média ponderada por data
    return Object.entries(groupedByDate)
      .map(([date, data]) => {
        const totalWeight = data.weights.reduce((a, b) => a + b, 0);
        const weightedAvg = totalWeight > 0
          ? data.prices.reduce((sum, price, i) => sum + price * data.weights[i], 0) / totalWeight
          : data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
        
        return {
          date,
          dateFormatted: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          preco: Number(weightedAvg.toFixed(2)),
          volume: totalWeight,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [loads, dateRange, selectedProducer]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (priceEvolutionData.length === 0) {
      return { avg: 0, min: 0, max: 0, trend: 0, trendPercent: 0 };
    }

    const prices = priceEvolutionData.map(d => d.preco);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    // Tendência: comparar média da primeira metade com a segunda
    const mid = Math.floor(prices.length / 2);
    const firstHalf = prices.slice(0, mid);
    const secondHalf = prices.slice(mid);
    const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    const trend = avgSecond - avgFirst;
    const trendPercent = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;

    return { avg, min, max, trend, trendPercent };
  }, [priceEvolutionData]);

  // Dados por produtor
  const pricesByProducer = useMemo(() => {
    if (!loads || !producers) return [];

    const producerPrices: Record<number, { name: string; prices: number[]; weights: number[] }> = {};

    loads.forEach((load: any) => {
      if (!load.pricePerKg || !load.producerId) return;
      
      const loadDate = new Date(load.createdAt);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      if (loadDate < startDate || loadDate > endDate) return;

      if (!producerPrices[load.producerId]) {
        const producer = producers.find((p: any) => p.id === load.producerId);
        producerPrices[load.producerId] = {
          name: producer?.name || `Produtor ${load.producerId}`,
          prices: [],
          weights: [],
        };
      }
      producerPrices[load.producerId].prices.push(Number(load.pricePerKg));
      producerPrices[load.producerId].weights.push(Number(load.totalWeight) || 0);
    });

    return Object.entries(producerPrices)
      .map(([id, data]) => {
        const totalWeight = data.weights.reduce((a, b) => a + b, 0);
        const avgPrice = totalWeight > 0
          ? data.prices.reduce((sum, price, i) => sum + price * data.weights[i], 0) / totalWeight
          : data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
        
        return {
          id: parseInt(id),
          name: data.name,
          avgPrice: Number(avgPrice.toFixed(2)),
          minPrice: Math.min(...data.prices),
          maxPrice: Math.max(...data.prices),
          totalWeight,
          cargas: data.prices.length,
        };
      })
      .sort((a, b) => b.totalWeight - a.totalWeight);
  }, [loads, producers, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Histórico de Preços
          </h1>
          <p className="text-muted-foreground">
            Evolução dos preços de compra de coco
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProducer} onValueChange={setSelectedProducer}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os Produtores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Produtores</SelectItem>
              {producers?.map((producer: any) => (
                <SelectItem key={producer.id} value={producer.id.toString()}>
                  {producer.name}
                </SelectItem>
              ))}
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

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço Médio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats.avg)}/kg</div>
                <p className="text-xs text-muted-foreground">No período selecionado</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço Mínimo</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.min)}/kg</div>
                <p className="text-xs text-muted-foreground">Menor preço pago</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço Máximo</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.max)}/kg</div>
                <p className="text-xs text-muted-foreground">Maior preço pago</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência</CardTitle>
            {stats.trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : stats.trend < 0 ? (
              <TrendingDown className="h-4 w-4 text-green-600" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${stats.trend > 0 ? 'text-red-600' : stats.trend < 0 ? 'text-green-600' : ''}`}>
                  {stats.trendPercent > 0 ? '+' : ''}{stats.trendPercent.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.trend > 0 ? 'Preços subindo' : stats.trend < 0 ? 'Preços caindo' : 'Estável'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Preço por kg</CardTitle>
          <CardDescription>Preço médio ponderado por volume ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : priceEvolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceEvolutionData}>
                  <defs>
                    <linearGradient id="colorPreco" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B7355" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B7355" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateFormatted" />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'preco' ? formatCurrency(value) + '/kg' : `${value.toLocaleString('pt-BR')} kg`,
                      name === 'preco' ? 'Preço' : 'Volume'
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="preco" 
                    name="Preço/kg"
                    stroke="#8B7355" 
                    fillOpacity={1} 
                    fill="url(#colorPreco)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhum dado de preço no período selecionado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Preços por Produtor */}
      <Card>
        <CardHeader>
          <CardTitle>Preços por Produtor</CardTitle>
          <CardDescription>Comparativo de preços médios por produtor no período</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pricesByProducer.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Produtor</th>
                    <th className="text-right py-3 px-2">Preço Médio</th>
                    <th className="text-right py-3 px-2">Mín.</th>
                    <th className="text-right py-3 px-2">Máx.</th>
                    <th className="text-right py-3 px-2">Volume Total</th>
                    <th className="text-center py-3 px-2">Cargas</th>
                  </tr>
                </thead>
                <tbody>
                  {pricesByProducer.map((producer) => (
                    <tr key={producer.id} className="border-b hover:bg-accent/50">
                      <td className="py-3 px-2 font-medium">{producer.name}</td>
                      <td className="py-3 px-2 text-right">{formatCurrency(producer.avgPrice)}/kg</td>
                      <td className="py-3 px-2 text-right text-green-600">{formatCurrency(producer.minPrice)}</td>
                      <td className="py-3 px-2 text-right text-red-600">{formatCurrency(producer.maxPrice)}</td>
                      <td className="py-3 px-2 text-right">{producer.totalWeight.toLocaleString('pt-BR')} kg</td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant="secondary">{producer.cargas}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado de preço por produtor no período
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
