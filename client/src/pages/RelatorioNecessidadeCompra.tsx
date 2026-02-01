import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, AlertTriangle, Download, Package, TrendingDown } from "lucide-react";

export default function RelatorioNecessidadeCompra() {
  const { data: warehouseItems } = trpc.warehouseItems.list.useQuery({ warehouseType: "producao" });
  
  const calcularNecessidade = () => {
    if (!warehouseItems) return [];
    return warehouseItems.map((item: any) => {
      const estoqueAtual = parseFloat(item.currentStock) || 0;
      const estoqueMinimo = parseFloat(item.minimumStock) || 0;
      const custoUnitario = parseFloat(item.unitCost) || 0;
      const necessidade = Math.max(0, estoqueMinimo - estoqueAtual);
      return {
        ...item, estoqueAtual, estoqueMinimo, necessidade, custoUnitario,
        custoTotal: necessidade * custoUnitario,
        status: estoqueAtual <= 0 ? "critico" : estoqueAtual < estoqueMinimo ? "baixo" : "ok"
      };
    }).filter((item: any) => item.necessidade > 0 || item.status !== "ok")
      .sort((a: any, b: any) => a.status === "critico" ? -1 : b.status === "critico" ? 1 : b.necessidade - a.necessidade);
  };
  
  const itensNecessarios = calcularNecessidade();
  const custoTotal = itensNecessarios.reduce((acc: number, item: any) => acc + item.custoTotal, 0);
  const itensCriticos = itensNecessarios.filter((i: any) => i.status === "critico").length;
  const itensBaixos = itensNecessarios.filter((i: any) => i.status === "baixo").length;
  
  const exportarCSV = () => {
    const headers = ["Código","Nome","Categoria","Unidade","Est.Atual","Est.Mín","Necessidade","Custo Unit.","Custo Total","Status"];
    const rows = itensNecessarios.map((i: any) => [i.internalCode,i.name,i.category,i.unit,i.estoqueAtual,i.estoqueMinimo,i.necessidade,i.custoUnitario.toFixed(2),i.custoTotal.toFixed(2),i.status]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "necessidade-compra-" + new Date().toISOString().split("T")[0] + ".csv";
    link.click();
    toast.success("Exportado!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Necessidade de Compra</h1>
            <p className="text-muted-foreground">Itens que precisam ser repostos</p>
          </div>
          <Button onClick={exportarCSV} disabled={!itensNecessarios.length}><Download className="mr-2 h-4 w-4" />Exportar CSV</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-red-100 rounded-lg"><AlertTriangle className="h-6 w-6 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Críticos</p><p className="text-2xl font-bold text-red-600">{itensCriticos}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-amber-100 rounded-lg"><TrendingDown className="h-6 w-6 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Baixos</p><p className="text-2xl font-bold text-amber-600">{itensBaixos}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><Package className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{itensNecessarios.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="p-3 bg-green-100 rounded-lg"><ShoppingCart className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Custo Est.</p><p className="text-2xl font-bold text-green-600">{custoTotal.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div></div></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Itens para Reposição</CardTitle><CardDescription>Abaixo do estoque mínimo</CardDescription></CardHeader>
          <CardContent>
            {!itensNecessarios.length ? <div className="text-center py-8 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Estoque adequado!</p></div> : (
              <table className="w-full">
                <thead><tr className="border-b"><th className="text-left py-3 px-2">Código</th><th className="text-left py-3 px-2">Nome</th><th className="text-right py-3 px-2">Atual</th><th className="text-right py-3 px-2">Mín.</th><th className="text-right py-3 px-2">Necessidade</th><th className="text-right py-3 px-2">Custo</th><th className="text-center py-3 px-2">Status</th></tr></thead>
                <tbody>{itensNecessarios.map((i: any) => (
                  <tr key={i.id} className={`border-b ${i.status==="critico"?"bg-red-50":i.status==="baixo"?"bg-amber-50":""}`}>
                    <td className="py-3 px-2 font-mono">{i.internalCode}</td>
                    <td className="py-3 px-2">{i.name}</td>
                    <td className="py-3 px-2 text-right">{i.estoqueAtual} {i.unit}</td>
                    <td className="py-3 px-2 text-right">{i.estoqueMinimo} {i.unit}</td>
                    <td className="py-3 px-2 text-right font-bold text-blue-600">{i.necessidade} {i.unit}</td>
                    <td className="py-3 px-2 text-right">{i.custoTotal.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                    <td className="py-3 px-2 text-center">{i.status==="critico"?<Badge variant="destructive">Crítico</Badge>:i.status==="baixo"?<Badge variant="outline" className="border-amber-500 text-amber-500">Baixo</Badge>:<Badge>OK</Badge>}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr className="bg-muted/50 font-bold"><td colSpan={5} className="py-3 px-2 text-right">Total:</td><td className="py-3 px-2 text-right text-green-600">{custoTotal.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td><td></td></tr></tfoot>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
