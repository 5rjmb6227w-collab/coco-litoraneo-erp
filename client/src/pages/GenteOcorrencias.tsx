import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, ClipboardList, Calendar, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GenteOcorrencias() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    eventType: "",
    employeeId: "",
    startDate: "",
    endDate: "",
  });

  const utils = trpc.useUtils();
  const { data: events = [], isLoading } = trpc.employees.events.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );
  const { data: employees = [] } = trpc.employees.list.useQuery({ status: "ativo" });

  const createMutation = trpc.employees.events.create.useMutation({
    onSuccess: () => {
      toast.success("Ocorrência registrada com sucesso!");
      setIsModalOpen(false);
      utils.employees.events.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    employeeId: "",
    eventDate: format(new Date(), "yyyy-MM-dd"),
    eventType: "falta_justificada" as "falta_justificada" | "falta_injustificada" | "atraso" | "saida_antecipada" | "hora_extra" | "atestado_medico",
    hoursQuantity: "",
    reason: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.eventDate) {
      toast.error("Selecione o colaborador e a data");
      return;
    }

    createMutation.mutate({
      employeeId: parseInt(formData.employeeId),
      eventDate: formData.eventDate,
      eventType: formData.eventType,
      hoursQuantity: formData.hoursQuantity || undefined,
      reason: formData.reason || undefined,
    });
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      eventDate: format(new Date(), "yyyy-MM-dd"),
      eventType: "falta_justificada",
      hoursQuantity: "",
      reason: "",
    });
  };

  const exportCSV = () => {
    const headers = ["Data", "Colaborador", "Tipo", "Horas", "Motivo"];
    const rows = events.map((o: any) => {
      const employee = employees.find((e: any) => e.id === o.employeeId);
      return [
        format(new Date(o.eventDate), "dd/MM/yyyy"),
        employee?.fullName || "-",
        typeLabels[o.eventType],
        o.hoursQuantity || "-",
        o.reason || "-",
      ];
    });

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ocorrencias_rh_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const typeLabels: Record<string, string> = {
    falta_justificada: "Falta Justificada",
    falta_injustificada: "Falta Injustificada",
    atraso: "Atraso",
    saida_antecipada: "Saída Antecipada",
    hora_extra: "Hora Extra",
    atestado_medico: "Atestado Médico",
  };

  const typeColors: Record<string, string> = {
    falta_justificada: "bg-yellow-100 text-yellow-800",
    falta_injustificada: "bg-red-100 text-red-800",
    atraso: "bg-orange-100 text-orange-800",
    saida_antecipada: "bg-purple-100 text-purple-800",
    hora_extra: "bg-blue-100 text-blue-800",
    atestado_medico: "bg-green-100 text-green-800",
  };

  // Estatísticas do mês atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthEvents = events.filter((o: any) => {
    const date = new Date(o.eventDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const faltas = thisMonthEvents.filter((o: any) => o.eventType === "falta_justificada" || o.eventType === "falta_injustificada").length;
  const atrasos = thisMonthEvents.filter((o: any) => o.eventType === "atraso").length;
  const horasExtras = thisMonthEvents
    .filter((o: any) => o.eventType === "hora_extra")
    .reduce((sum: number, o: any) => sum + (parseFloat(o.hoursQuantity) || 0), 0);
  const atestados = thisMonthEvents.filter((o: any) => o.eventType === "atestado_medico").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ocorrências</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registre faltas, atrasos, horas extras e outras ocorrências
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Ocorrência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Ocorrência</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Colaborador *</Label>
                  <Select
                    value={formData.employeeId}
                    onValueChange={(v) => setFormData({ ...formData, employeeId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee: any) => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
                          {employee.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select
                      value={formData.eventType}
                      onValueChange={(v) => setFormData({ ...formData, eventType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                        <SelectItem value="falta_injustificada">Falta Injustificada</SelectItem>
                        <SelectItem value="atraso">Atraso</SelectItem>
                        <SelectItem value="saida_antecipada">Saída Antecipada</SelectItem>
                        <SelectItem value="hora_extra">Hora Extra</SelectItem>
                        <SelectItem value="atestado_medico">Atestado Médico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(formData.eventType === "hora_extra" || formData.eventType === "atraso" || formData.eventType === "saida_antecipada") && (
                  <div className="space-y-2">
                    <Label>Quantidade de Horas</Label>
                    <Input
                      value={formData.hoursQuantity}
                      onChange={(e) => setFormData({ ...formData, hoursQuantity: e.target.value })}
                      placeholder="Ex: 2.5"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Motivo/Observação</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    placeholder="Descreva o motivo ou observação..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Registrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo - Mês Atual */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-500" />
              Faltas (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{faltas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Atrasos (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{atrasos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Horas Extras (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{horasExtras.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-green-500" />
              Atestados (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{atestados}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select
                value={filters.employeeId}
                onValueChange={(v) => setFilters({ ...filters, employeeId: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={filters.eventType}
                onValueChange={(v) => setFilters({ ...filters, eventType: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="falta_justificada">Falta Justificada</SelectItem>
                  <SelectItem value="falta_injustificada">Falta Injustificada</SelectItem>
                  <SelectItem value="atraso">Atraso</SelectItem>
                  <SelectItem value="saida_antecipada">Saída Antecipada</SelectItem>
                  <SelectItem value="hora_extra">Hora Extra</SelectItem>
                  <SelectItem value="atestado_medico">Atestado Médico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-40"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setFilters({ eventType: "", employeeId: "", startDate: "", endDate: "" })}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhuma ocorrência encontrada
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event: any) => {
                  const employee = employees.find((e: any) => e.id === event.employeeId);
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        {format(new Date(event.eventDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">{employee?.fullName || "-"}</TableCell>
                      <TableCell>
                        <Badge className={typeColors[event.eventType]}>
                          {typeLabels[event.eventType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.hoursQuantity ? `${event.hoursQuantity}h` : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={event.reason || ""}>
                        {event.reason || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
