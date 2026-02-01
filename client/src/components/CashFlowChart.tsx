import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import Chart from "chart.js/auto";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashFlowData {
  weekStart?: string | Date;
  weekEnd?: string | Date;
  entradas: number;
  saidas: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
  title?: string;
}

export function CashFlowChart({ data, title = "Fluxo de Caixa Visual" }: CashFlowChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Destruir gráfico anterior se existir
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Preparar dados
    const labels = data.map((item, index) => {
      if (item.weekStart && item.weekEnd) {
        const start = new Date(item.weekStart);
        const end = new Date(item.weekEnd);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          return `${format(start, "dd/MM")} - ${format(end, "dd/MM")}`;
        }
      }
      return `Semana ${index + 1}`;
    });

    const entradas = data.map(item => Number(item.entradas) || 0);
    const saidas = data.map(item => Number(item.saidas) || 0);
    
    // Calcular saldo acumulado
    let runningBalance = 0;
    const saldoAcumulado = data.map(item => {
      runningBalance += (Number(item.entradas) || 0) - (Number(item.saidas) || 0);
      return runningBalance;
    });

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Entradas",
            data: entradas,
            backgroundColor: "rgba(34, 197, 94, 0.7)",
            borderColor: "rgb(34, 197, 94)",
            borderWidth: 1,
            borderRadius: 4,
            order: 2,
          },
          {
            label: "Saídas",
            data: saidas.map(v => -v), // Valores negativos para mostrar abaixo
            backgroundColor: "rgba(239, 68, 68, 0.7)",
            borderColor: "rgb(239, 68, 68)",
            borderWidth: 1,
            borderRadius: 4,
            order: 3,
          },
          {
            label: "Saldo Acumulado",
            data: saldoAcumulado,
            type: "line",
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: "rgb(59, 130, 246)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              padding: 20,
            },
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const value = Math.abs(context.raw as number);
                const formatted = value.toLocaleString("pt-BR", { 
                  style: "currency", 
                  currency: "BRL" 
                });
                if (context.dataset.label === "Saídas") {
                  return `${context.dataset.label}: -${formatted}`;
                }
                return `${context.dataset.label}: ${formatted}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              callback: function(value: string | number) {
                return (Number(value)).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  notation: "compact",
                });
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  // Calcular totais
  const totalEntradas = data.reduce((sum, item) => sum + (Number(item.entradas) || 0), 0);
  const totalSaidas = data.reduce((sum, item) => sum + (Number(item.saidas) || 0), 0);
  const saldoFinal = totalEntradas - totalSaidas;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Entradas:</span>
              <span className="font-semibold text-green-600">
                R$ {totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Saídas:</span>
              <span className="font-semibold text-red-600">
                R$ {totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <Badge 
              variant={saldoFinal >= 0 ? "default" : "destructive"}
              className="text-sm px-3 py-1"
            >
              Saldo: R$ {saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhum dado de fluxo de caixa disponível
          </div>
        ) : (
          <div style={{ height: "350px" }}>
            <canvas ref={chartRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
