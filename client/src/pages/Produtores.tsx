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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Download, Users, Edit, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Produtores() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProducer, setSelectedProducer] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    cpfCnpj: "",
    phone: "",
    email: "",
    address: "",
    bank: "",
    agency: "",
    account: "",
    accountType: "corrente" as "corrente" | "poupanca",
    pixKey: "",
    defaultPricePerKg: "",
    defaultDiscountPercent: "0",
    externalCode: "",
  });

  // Queries
  const { data: producers, refetch } = trpc.producers.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: searchTerm || undefined,
  });

  // Mutations
  const createMutation = trpc.producers.create.useMutation({
    onSuccess: () => {
      toast.success("Produtor cadastrado com sucesso!");
      setIsModalOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar produtor: " + error.message);
    },
  });

  const updateMutation = trpc.producers.update.useMutation({
    onSuccess: () => {
      toast.success("Produtor atualizado com sucesso!");
      setIsViewModalOpen(false);
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produtor: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      cpfCnpj: "",
      phone: "",
      email: "",
      address: "",
      bank: "",
      agency: "",
      account: "",
      accountType: "corrente",
      pixKey: "",
      defaultPricePerKg: "",
      defaultDiscountPercent: "0",
      externalCode: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.cpfCnpj || !formData.defaultPricePerKg) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      cpfCnpj: formData.cpfCnpj,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      bank: formData.bank || undefined,
      agency: formData.agency || undefined,
      account: formData.account || undefined,
      accountType: formData.accountType,
      pixKey: formData.pixKey || undefined,
      defaultPricePerKg: formData.defaultPricePerKg,
      defaultDiscountPercent: formData.defaultDiscountPercent || undefined,
      externalCode: formData.externalCode || undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedProducer) return;

    updateMutation.mutate({
      id: selectedProducer.id,
      name: formData.name,
      cpfCnpj: formData.cpfCnpj,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      address: formData.address || undefined,
      bank: formData.bank || undefined,
      agency: formData.agency || undefined,
      account: formData.account || undefined,
      accountType: formData.accountType,
      pixKey: formData.pixKey || undefined,
      defaultPricePerKg: formData.defaultPricePerKg,
      defaultDiscountPercent: formData.defaultDiscountPercent || undefined,
      externalCode: formData.externalCode || undefined,
    });
  };

  const handleToggleStatus = (producer: any) => {
    updateMutation.mutate({
      id: producer.id,
      status: producer.status === "ativo" ? "inativo" : "ativo",
    });
  };

  const openViewModal = (producer: any) => {
    setSelectedProducer(producer);
    setFormData({
      name: producer.name,
      cpfCnpj: producer.cpfCnpj,
      phone: producer.phone || "",
      email: producer.email || "",
      address: producer.address || "",
      bank: producer.bank || "",
      agency: producer.agency || "",
      account: producer.account || "",
      accountType: producer.accountType || "corrente",
      pixKey: producer.pixKey || "",
      defaultPricePerKg: producer.defaultPricePerKg,
      defaultDiscountPercent: producer.defaultDiscountPercent || "0",
      externalCode: producer.externalCode || "",
    });
    setIsEditing(false);
    setIsViewModalOpen(true);
  };

  const exportCSV = () => {
    if (!producers || producers.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = ["company_code", "entity_id", "external_code", "nome", "cpf_cnpj", "telefone", "email", "preco_kg", "desconto_percent", "status", "created_at"];
    const rows = producers.map(p => [
      "COCO_LITORANEO",
      p.id,
      p.externalCode || "",
      p.name,
      p.cpfCnpj,
      p.phone || "",
      p.email || "",
      p.defaultPricePerKg,
      p.defaultDiscountPercent || "0",
      p.status,
      format(new Date(p.createdAt), "yyyy-MM-dd'T'HH:mm:ss"),
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `produtores_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Arquivo exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtores</h1>
          <p className="text-muted-foreground">Cadastre e gerencie os fornecedores de coco</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Produtor
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
                  placeholder="Buscar por nome ou CPF/CNPJ..."
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
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
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
            <Users className="h-5 w-5" />
            Produtores Cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Preço/kg</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {producers && producers.length > 0 ? (
                  producers.map((producer) => (
                    <TableRow key={producer.id}>
                      <TableCell className="font-medium">{producer.name}</TableCell>
                      <TableCell>{producer.cpfCnpj}</TableCell>
                      <TableCell>{producer.phone || "-"}</TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {Number(producer.defaultPricePerKg).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {Number(producer.defaultDiscountPercent || 0).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={producer.status === "ativo" ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => handleToggleStatus(producer)}
                        >
                          {producer.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewModal(producer)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum produtor cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Novo Produtor */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Produtor</DialogTitle>
            <DialogDescription>
              Cadastre um novo fornecedor de coco
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="bancarios">Bancários</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
            </TabsList>
            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  placeholder="Nome do produtor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                  <Input
                    id="cpfCnpj"
                    placeholder="000.000.000-00"
                    value={formData.cpfCnpj}
                    onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Endereço completo"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </TabsContent>
            <TabsContent value="bancarios" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank">Banco</Label>
                  <Input
                    id="bank"
                    placeholder="Nome do banco"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountType">Tipo de Conta</Label>
                  <Select
                    value={formData.accountType}
                    onValueChange={(value: "corrente" | "poupanca") => setFormData({ ...formData, accountType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Corrente</SelectItem>
                      <SelectItem value="poupanca">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agency">Agência</Label>
                  <Input
                    id="agency"
                    placeholder="0000"
                    value={formData.agency}
                    onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account">Conta</Label>
                  <Input
                    id="account"
                    placeholder="00000-0"
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pixKey">Chave PIX</Label>
                <Input
                  id="pixKey"
                  placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                  value={formData.pixKey}
                  onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                />
              </div>
            </TabsContent>
            <TabsContent value="comercial" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultPricePerKg">Preço por kg (R$) *</Label>
                  <Input
                    id="defaultPricePerKg"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.defaultPricePerKg}
                    onChange={(e) => setFormData({ ...formData, defaultPricePerKg: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultDiscountPercent">Desconto Padrão (%)</Label>
                  <Input
                    id="defaultDiscountPercent"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.defaultDiscountPercent}
                    onChange={(e) => setFormData({ ...formData, defaultDiscountPercent: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalCode">Código Externo (ERP)</Label>
                <Input
                  id="externalCode"
                  placeholder="Código no sistema externo"
                  value={formData.externalCode}
                  onChange={(e) => setFormData({ ...formData, externalCode: e.target.value })}
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Cadastrar Produtor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar/Editar Produtor */}
      <Dialog open={isViewModalOpen} onOpenChange={(open) => { setIsViewModalOpen(open); if (!open) setIsEditing(false); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isEditing ? "Editar Produtor" : "Detalhes do Produtor"}</span>
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="bancarios">Bancários</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
            </TabsList>
            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{formData.name}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  {isEditing ? (
                    <Input
                      value={formData.cpfCnpj}
                      onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{formData.cpfCnpj}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  {isEditing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{formData.phone || "-"}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                {isEditing ? (
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{formData.email || "-"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                {isEditing ? (
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{formData.address || "-"}</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="bancarios" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Banco</Label>
                  {isEditing ? (
                    <Input
                      value={formData.bank}
                      onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{formData.bank || "-"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Conta</Label>
                  {isEditing ? (
                    <Select
                      value={formData.accountType}
                      onValueChange={(value: "corrente" | "poupanca") => setFormData({ ...formData, accountType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">Corrente</SelectItem>
                        <SelectItem value="poupanca">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium capitalize">{formData.accountType || "-"}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agência</Label>
                  {isEditing ? (
                    <Input
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{formData.agency || "-"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  {isEditing ? (
                    <Input
                      value={formData.account}
                      onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium">{formData.account || "-"}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                {isEditing ? (
                  <Input
                    value={formData.pixKey}
                    onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{formData.pixKey || "-"}</p>
                )}
              </div>
            </TabsContent>
            <TabsContent value="comercial" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço por kg (R$)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.defaultPricePerKg}
                      onChange={(e) => setFormData({ ...formData, defaultPricePerKg: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium font-mono">R$ {Number(formData.defaultPricePerKg).toFixed(2)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Desconto Padrão (%)</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.defaultDiscountPercent}
                      onChange={(e) => setFormData({ ...formData, defaultDiscountPercent: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium font-mono">{Number(formData.defaultDiscountPercent).toFixed(1)}%</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Código Externo (ERP)</Label>
                {isEditing ? (
                  <Input
                    value={formData.externalCode}
                    onChange={(e) => setFormData({ ...formData, externalCode: e.target.value })}
                  />
                ) : (
                  <p className="font-medium">{formData.externalCode || "-"}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {selectedProducer && (
            <div className="text-xs text-muted-foreground border-t pt-4 mt-4">
              <p>Criado em: {format(new Date(selectedProducer.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              <p>Atualizado em: {format(new Date(selectedProducer.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
          )}
          <DialogFooter className="mt-4">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                Fechar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
