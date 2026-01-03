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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Users, Pencil, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GenteColaboradores() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: "",
    sector: "",
    search: "",
  });

  const utils = trpc.useUtils();
  const { data: employees = [], isLoading } = trpc.employees.list.useQuery(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador cadastrado com sucesso!");
      setIsModalOpen(false);
      utils.employees.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      utils.employees.list.invalidate();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const [formData, setFormData] = useState({
    fullName: "",
    cpf: "",
    birthDate: "",
    phone: "",
    admissionDate: format(new Date(), "yyyy-MM-dd"),
    sector: "producao" as "recepcao" | "producao" | "embalagem" | "expedicao" | "qualidade" | "manutencao" | "almoxarifado" | "administrativo",
    position: "",
    emergencyContact: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.cpf || !formData.admissionDate || !formData.position) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      fullName: formData.fullName,
      cpf: formData.cpf,
      birthDate: formData.birthDate || undefined,
      phone: formData.phone || undefined,
      admissionDate: formData.admissionDate,
      sector: formData.sector,
      position: formData.position,
      emergencyContact: formData.emergencyContact || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateMutation.mutate({
      id: selectedEmployee.id,
      fullName: formData.fullName || undefined,
      position: formData.position || undefined,
      sector: formData.sector,
      phone: formData.phone || undefined,
      emergencyContact: formData.emergencyContact || undefined,
    });
  };

  const openEditModal = (employee: any) => {
    setSelectedEmployee(employee);
    setFormData({
      fullName: employee.fullName,
      cpf: employee.cpf,
      birthDate: employee.birthDate ? format(new Date(employee.birthDate), "yyyy-MM-dd") : "",
      phone: employee.phone || "",
      admissionDate: format(new Date(employee.admissionDate), "yyyy-MM-dd"),
      sector: employee.sector,
      position: employee.position || "",
      emergencyContact: employee.emergencyContact || "",
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      cpf: "",
      birthDate: "",
      phone: "",
      admissionDate: format(new Date(), "yyyy-MM-dd"),
      sector: "producao",
      position: "",
      emergencyContact: "",
    });
  };

  const exportCSV = () => {
    const headers = ["Nome", "CPF", "Setor", "Cargo", "Admissão", "Status", "Telefone"];
    const rows = employees.map((e: any) => [
      e.fullName,
      e.cpf,
      sectorLabels[e.sector],
      e.position || "-",
      format(new Date(e.admissionDate), "dd/MM/yyyy"),
      e.status === "ativo" ? "Ativo" : e.status === "afastado" ? "Afastado" : "Desligado",
      e.phone || "-",
    ]);

    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `colaboradores_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const sectorLabels: Record<string, string> = {
    recepcao: "Recepção",
    producao: "Produção",
    embalagem: "Embalagem",
    expedicao: "Expedição",
    qualidade: "Qualidade",
    manutencao: "Manutenção",
    almoxarifado: "Almoxarifado",
    administrativo: "Administrativo",
  };

  // Estatísticas
  const ativos = employees.filter((e: any) => e.status === "ativo").length;
  const inativos = employees.filter((e: any) => e.status !== "ativo").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Colaboradores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie o cadastro de colaboradores
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
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Colaborador</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF *</Label>
                    <Input
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Admissão *</Label>
                    <Input
                      type="date"
                      value={formData.admissionDate}
                      onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Setor *</Label>
                    <Select
                      value={formData.sector}
                      onValueChange={(v) => setFormData({ ...formData, sector: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recepcao">Recepção</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="embalagem">Embalagem</SelectItem>
                        <SelectItem value="expedicao">Expedição</SelectItem>
                        <SelectItem value="qualidade">Qualidade</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cargo *</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Ex: Operador de Produção"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contato de Emergência</Label>
                  <Input
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Nome e telefone"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Salvando..." : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{employees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{ativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4 text-gray-500" />
              Afastados/Desligados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-600">{inativos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <Input
                placeholder="Nome ou CPF..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-48"
              />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select
                value={filters.sector}
                onValueChange={(v) => setFilters({ ...filters, sector: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="recepcao">Recepção</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="embalagem">Embalagem</SelectItem>
                  <SelectItem value="expedicao">Expedição</SelectItem>
                  <SelectItem value="qualidade">Qualidade</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                  <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                  <SelectItem value="administrativo">Administrativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="afastado">Afastado</SelectItem>
                  <SelectItem value="desligado">Desligado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setFilters({ status: "", sector: "", search: "" })}
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
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Nenhum colaborador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee: any) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.fullName}</TableCell>
                    <TableCell className="font-mono text-sm">{employee.cpf}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sectorLabels[employee.sector]}</Badge>
                    </TableCell>
                    <TableCell>{employee.position || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(employee.admissionDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        employee.status === "ativo" 
                          ? "bg-green-100 text-green-800" 
                          : employee.status === "afastado"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-600"
                      }>
                        {employee.status === "ativo" ? "Ativo" : employee.status === "afastado" ? "Afastado" : "Desligado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(employee)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select
                    value={formData.sector}
                    onValueChange={(v) => setFormData({ ...formData, sector: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recepcao">Recepção</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="embalagem">Embalagem</SelectItem>
                      <SelectItem value="expedicao">Expedição</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contato de Emergência</Label>
                <Input
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Atualizar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
