import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Tags } from "lucide-react";

interface TypeForm {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const defaultForm: TypeForm = { code: "", name: "", description: "", icon: "🏭", color: "#3B82F6" };

export default function CustoConfigTipos() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TypeForm>(defaultForm);

  const types = trpc.costs.costCenterTypes.list.useQuery();
  const createMutation = trpc.costs.costCenterTypes.create.useMutation({
    onSuccess: () => { toast.success("Tipo criado com sucesso"); types.refetch(); closeModal(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.costs.costCenterTypes.update.useMutation({
    onSuccess: () => { toast.success("Tipo atualizado com sucesso"); types.refetch(); closeModal(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.costs.costCenterTypes.delete.useMutation({
    onSuccess: () => { toast.success("Tipo excluído com sucesso"); types.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  function closeModal() { setShowModal(false); setEditingId(null); setForm(defaultForm); }
  function openNew() { setForm(defaultForm); setEditingId(null); setShowModal(true); }
  function openEdit(item: any) {
    setForm({ code: item.code, name: item.name, description: item.description || "", icon: item.icon || "🏭", color: item.color || "#3B82F6" });
    setEditingId(item.id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.code || !form.name) { toast.error("Código e nome são obrigatórios"); return; }
    if (editingId) { updateMutation.mutate({ id: editingId, ...form }); }
    else { createMutation.mutate(form); }
  }

  const iconOptions = ["🏭", "🔧", "📋", "🔬", "🚚", "💼", "📊", "🛒", "⚙️", "🏢"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tags className="w-6 h-6" />Configuração de Tipos de Centros de Custo</h1>
          <p className="text-muted-foreground">Gerencie os tipos disponíveis para classificação dos centros de custo</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Tipo</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos Cadastrados</CardTitle>
          <CardDescription>{types.data?.length || 0} tipo(s) cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ícone</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.data?.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xl">{t.icon || "🏭"}</TableCell>
                  <TableCell className="font-mono">{t.code}</TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: t.color || "#3B82F6" }} />
                      <span className="text-xs font-mono">{t.color || "#3B82F6"}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Excluir este tipo?")) deleteMutation.mutate({ id: t.id }); }}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!types.data || types.data.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum tipo cadastrado. Clique em "Novo Tipo" para começar.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Tipo" : "Novo Tipo de Centro de Custo"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: COMERCIAL" maxLength={20} /></div>
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Comercial" /></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do tipo" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {iconOptions.map((icon) => (
                    <button key={icon} type="button" className={`w-10 h-10 rounded border text-xl flex items-center justify-center ${form.icon === icon ? "border-primary bg-primary/10" : "border-border"}`} onClick={() => setForm({ ...form, icon })}>{icon}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Cor</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editingId ? "Atualizar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
