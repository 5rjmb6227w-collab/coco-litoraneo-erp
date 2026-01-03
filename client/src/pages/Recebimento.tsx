import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Download, Truck, Eye, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Recebimento() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    receivedAt: new Date().toISOString().slice(0, 16),
    producerId: "",
    licensePlate: "",
    driverName: "",
    grossWeight: "",
    tareWeight: "",
    observations: "",
  });

  // Queries
  const { data: loads, refetch } = trpc.coconutLoads.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchTerm || undefined,
  });
  const { data: producers } = trpc.producers.list.useQuery({ status: "ativo" });

  // Mutations
  const createMutation = trpc.coconutLoads.create.useMutation({
    onSuccess: () => {
      toast.success("Carga registrada com sucesso!");
      setIsModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar carga: " + error.message);
    },
  });

  const updateMutation = trpc.coconutLoads.update.useMutation({
    onSuccess: () => {
      toast.success("Carga atualizada com sucesso!");
      setIsViewModalOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar carga: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      receivedAt: new Date().toISOString().slice(0, 16),
      producerId: "",
      licensePlate: "",
      driverName: "",
      grossWeight: "",
      tareWeight: "",
      observations: "",
    });
  };

  const calculateNetWeight = () => {
    const gross = parseFloat(formData.grossWeight) || 0;
    const tare = parseFloat(formData.tareWeight) || 0;
    return Math.max(0, gross - tare);
  };

  const handleSubmit = () => {
    if (!formData.producerId || !formData.licensePlate || !formData.grossWeight || !formData.tareWeight) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      receivedAt: formData.receivedAt,
      producerId: parseInt(formData.producerId),
      licensePlate: formData.licensePlate.toUpperCase(),
      driverName: formData.driverName || undefined,
      grossWeight: formData.grossWeight,
      tareWeight: formData.tareWeight,
      netWeight: calculateNetWeight().toString(),
      observations: formData.observations || undefined,
    });
  };

  const handleStatusChange = (loadId: number, newStatus: "recebido" | "conferido" | "fechado") => {
    updateMutation.mutate({
      id: loadId,
      status: newStatus,
    });
  };

  const getProducerName = (producerId: number) => {
    return producers?.find(p => p.id === producerId)?.name || "Desconhecido";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "recebido":
        return <Badge variant="outline" className="status-recebido">Recebido</Badge>;
      case "conferido":
        return <Badge variant="outline" className="status-conferido">Conferido</Badge>;
      case "fechado":
        return <Badge variant="outline" className="status-fechado">Fechado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportCSV = () => {
    if (!loads || loads.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = ["company_code", "entity_id", "data_recebimento", "produtor", "placa", "motorista", "peso_bruto", "peso_tara", "peso_liquido", "status", "created_at"];
    const rows = loads.map(load => [
      "COCO_LITORANEO",
      load.id,
      format(new Date(load.receivedAt), "yyyy-MM-dd"),
      getProducerName(load.producerId),
      load.licensePlate,
      load.driverName || "",
      load.grossWeight,
      load.tareWeight,
      load.netWeight,
      load.status,
      format(new Date(load.createdAt), "yyyy-MM-dd'T'HH:mm:ss"),
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `recebimento_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Arquivo exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recebimento de Coco</h1>
          <p className="text-muted-foreground">Registre e gerencie as cargas de coco recebidas</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Carga
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="conferido">Conferido</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Cargas Registradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produtor</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead className="text-right">Peso Líquido (kg)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loads && loads.length > 0 ? (
                  loads.map((load) => (
                    <TableRow key={load.id}>
                      <TableCell>
                        {format(new Date(load.receivedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{getProducerName(load.producerId)}</TableCell>
                      <TableCell>{load.licensePlate}</TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(load.netWeight).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(load.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLoad(load);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {load.status === "recebido" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(load.id, "conferido")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {load.status === "conferido" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusChange(load.id, "fechado")}
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma carga registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Nova Carga */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Carga de Coco</DialogTitle>
            <DialogDescription>
              Registre uma nova carga de coco recebida
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receivedAt">Data/Hora Recebimento *</Label>
                <Input
                  id="receivedAt"
                  type="datetime-local"
                  value={formData.receivedAt}
                  onChange={(e) => setFormData({ ...formData, receivedAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licensePlate">Placa do Veículo *</Label>
                <Input
                  id="licensePlate"
                  placeholder="ABC-1234"
                  value={formData.licensePlate}
                  onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                  maxLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="producerId">Produtor *</Label>
              <Select
                value={formData.producerId}
                onValueChange={(value) => setFormData({ ...formData, producerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produtor" />
                </SelectTrigger>
                <SelectContent>
                  {producers?.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id.toString()}>
                      {producer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverName">Nome do Motorista</Label>
              <Input
                id="driverName"
                placeholder="Nome do motorista"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grossWeight">Peso Bruto (kg) *</Label>
                <Input
                  id="grossWeight"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.grossWeight}
                  onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tareWeight">Peso Tara (kg) *</Label>
                <Input
                  id="tareWeight"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.tareWeight}
                  onChange={(e) => setFormData({ ...formData, tareWeight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Peso Líquido (kg)</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted text-foreground font-mono">
                  {calculateNetWeight().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                placeholder="Observações sobre a carga..."
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Registrar Carga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar/Editar Carga */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Carga</DialogTitle>
            <DialogDescription>
              Visualize os detalhes da carga de coco
            </DialogDescription>
          </DialogHeader>
          {selectedLoad && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data/Hora</Label>
                  <p className="font-medium">
                    {format(new Date(selectedLoad.receivedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedLoad.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Produtor</Label>
                <p className="font-medium">{getProducerName(selectedLoad.producerId)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Placa</Label>
                  <p className="font-medium">{selectedLoad.licensePlate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Motorista</Label>
                  <p className="font-medium">{selectedLoad.driverName || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Peso Bruto</Label>
                  <p className="font-medium font-mono">
                    {Number(selectedLoad.grossWeight).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Peso Tara</Label>
                  <p className="font-medium font-mono">
                    {Number(selectedLoad.tareWeight).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Peso Líquido</Label>
                  <p className="font-medium font-mono text-primary">
                    {Number(selectedLoad.netWeight).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
                  </p>
                </div>
              </div>

              {selectedLoad.observations && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="font-medium">{selectedLoad.observations}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground border-t pt-4">
                <p>Criado em: {format(new Date(selectedLoad.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                {selectedLoad.closedAt && (
                  <p>Fechado em: {format(new Date(selectedLoad.closedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
            {selectedLoad?.status === "recebido" && (
              <Button onClick={() => handleStatusChange(selectedLoad.id, "conferido")}>
                <Check className="h-4 w-4 mr-2" />
                Marcar como Conferido
              </Button>
            )}
            {selectedLoad?.status === "conferido" && (
              <Button onClick={() => handleStatusChange(selectedLoad.id, "fechado")}>
                <Lock className="h-4 w-4 mr-2" />
                Fechar Carga
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
