import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  FileText, 
  Download, 
  FileSpreadsheet,
  Calendar,
  Factory,
  Truck,
  DollarSign,
  Package,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";

type ReportType = "producao" | "recebimento" | "financeiro" | "estoque" | "produtores" | "custos";

const reportTypes: { id: ReportType; name: string; description: string; icon: any }[] = [
  { id: "producao", name: "Produção", description: "Relatório de apontamentos e metas de produção", icon: Factory },
  { id: "recebimento", name: "Recebimento", description: "Relatório de cargas recebidas de coco", icon: Truck },
  { id: "financeiro", name: "Financeiro", description: "Relatório de pagamentos e contas a pagar", icon: DollarSign },
  { id: "estoque", name: "Estoque", description: "Relatório de estoque de produto acabado", icon: Package },
  { id: "produtores", name: "Produtores", description: "Relatório de produtores e fornecimentos", icon: Users },
  { id: "custos", name: "Custos", description: "Relatório de custos de produção", icon: TrendingUp },
];

export default function Relatorios() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("producao");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<{
    id: number;
    name: string;
    type: string;
    format: string;
    date: string;
    size: string;
  }[]>([
    { id: 1, name: "Produção Janeiro 2026", type: "producao", format: "PDF", date: "2026-01-28", size: "245 KB" },
    { id: 2, name: "Recebimento Semanal", type: "recebimento", format: "Excel", date: "2026-01-27", size: "128 KB" },
    { id: 3, name: "Custos Q4 2025", type: "custos", format: "PDF", date: "2026-01-25", size: "512 KB" },
  ]);

  // Mutations para gerar relatórios
  const generatePdfMutation = trpc.reports.generatePdf.useMutation({
    onSuccess: (data) => {
      toast.success("Relatório PDF gerado com sucesso!");
      setGeneratedReports(prev => [{
        id: prev.length + 1,
        name: `${reportTypes.find(r => r.id === selectedReport)?.name} - ${new Date().toLocaleDateString("pt-BR")}`,
        type: selectedReport,
        format: "PDF",
        date: new Date().toISOString().split("T")[0],
        size: "~200 KB",
      }, ...prev]);
      setIsGenerating(false);
      // Abrir PDF em nova aba
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar PDF: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const generateExcelMutation = trpc.reports.generateExcel.useMutation({
    onSuccess: (data: any) => {
      toast.success("Relatório Excel gerado com sucesso!");
      setGeneratedReports(prev => [{
        id: prev.length + 1,
        name: `${reportTypes.find(r => r.id === selectedReport)?.name} - ${new Date().toLocaleDateString("pt-BR")}`,
        type: selectedReport,
        format: "Excel",
        date: new Date().toISOString().split("T")[0],
        size: "~150 KB",
      }, ...prev]);
      setIsGenerating(false);
      // Download do arquivo
      if (data.url) {
        const link = document.createElement("a");
        link.href = data.url;
        link.download = `relatorio_${selectedReport}_${new Date().toISOString().split("T")[0]}.xlsx`;
        link.click();
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar Excel: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const handleGenerateReport = (format: "pdf" | "excel") => {
    setIsGenerating(true);
    
    const params = {
      type: selectedReport,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    };

    if (format === "pdf") {
      generatePdfMutation.mutate(params);
    } else {
      generateExcelMutation.mutate(params);
    }
  };

  const formatTypeLabels: Record<string, string> = {
    producao: "Produção",
    recebimento: "Recebimento",
    financeiro: "Financeiro",
    estoque: "Estoque",
    produtores: "Produtores",
    custos: "Custos",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Relatórios
        </h1>
        <p className="text-muted-foreground">
          Gere e exporte relatórios em PDF ou Excel
        </p>
      </div>

      <Tabs defaultValue="gerar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gerar">Gerar Relatório</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Gerar Relatório */}
        <TabsContent value="gerar" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Seleção de Tipo */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Relatório</CardTitle>
                <CardDescription>Selecione o tipo de relatório que deseja gerar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {reportTypes.map((report) => {
                    const Icon = report.icon;
                    return (
                      <div
                        key={report.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedReport === report.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-accent/50"
                        }`}
                        onClick={() => setSelectedReport(report.id)}
                      >
                        <div className={`p-2 rounded-lg ${selectedReport === report.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{report.name}</p>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                        </div>
                        {selectedReport === report.id && (
                          <Badge>Selecionado</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Configurações */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Período
                  </CardTitle>
                  <CardDescription>Defina o período do relatório</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data Inicial</Label>
                      <Input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Final</Label>
                      <Input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 7);
                        setDateRange({
                          startDate: start.toISOString().split("T")[0],
                          endDate: end.toISOString().split("T")[0],
                        });
                      }}
                    >
                      Última Semana
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 30);
                        setDateRange({
                          startDate: start.toISOString().split("T")[0],
                          endDate: end.toISOString().split("T")[0],
                        });
                      }}
                    >
                      Último Mês
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 90);
                        setDateRange({
                          startDate: start.toISOString().split("T")[0],
                          endDate: end.toISOString().split("T")[0],
                        });
                      }}
                    >
                      Último Trimestre
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Botões de Exportação */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Exportar
                  </CardTitle>
                  <CardDescription>Escolha o formato de exportação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      className="h-20 flex-col gap-2"
                      onClick={() => handleGenerateReport("pdf")}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <FileText className="h-6 w-6" />
                      )}
                      <span>Gerar PDF</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex-col gap-2"
                      onClick={() => handleGenerateReport("excel")}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-6 w-6" />
                      )}
                      <span>Gerar Excel</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    O relatório será gerado com os dados do período selecionado
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Gerados</CardTitle>
              <CardDescription>Histórico dos últimos relatórios gerados</CardDescription>
            </CardHeader>
            <CardContent>
              {generatedReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum relatório gerado ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${report.format === "PDF" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                          {report.format === "PDF" ? (
                            <FileText className="h-5 w-5" />
                          ) : (
                            <FileSpreadsheet className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {formatTypeLabels[report.type]}
                            </Badge>
                            <span>•</span>
                            <span>{new Date(report.date).toLocaleDateString("pt-BR")}</span>
                            <span>•</span>
                            <span>{report.size}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
