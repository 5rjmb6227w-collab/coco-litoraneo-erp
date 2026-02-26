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
import { Plus, MoreHorizontal, Pencil, Trash2, FolderCog } from "lucide-react";

interface CategoryForm {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const defaultForm: CategoryForm = { code: "", name: "", description: "", icon: "⚡", color: "#F59E0B" };

export default function CustoConfigCategorias() {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryForm>(defaultForm);

  const categories = trpc.costs.indirectCostCategories.list.useQuery();
  const createMutation = trpc.costs.indirectCostCategories.create.useMutation({
    onSuccess: () => { toast.success("Categoria criada com sucesso"); categories.refetch(); closeModal(); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.costs.indirectCostCategories.update.useMutation({
    onSuccess: () => { toast.success("Categoria atualizada com sucesso"); categories.refetch(); closeModal(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.costs.indirectCostCategories.delete.useMutation({
    onSuccess: () => { toast.success("Categoria excluída com sucesso"); categories.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  function closeModal() { setShowModal(false); setEditingId(null); setForm(defaultForm); }
  function openNew() { setForm(defaultForm); setEditingId(null); setShowModal(true); }
  function openEdit(item: any) {
    setForm({ code: item.code, name: item.name, description: item.description || "", icon: item.icon || "⚡", color: item.color || "#F59E0B" });
    setEditingId(item.id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.code || !form.name) { toast.error("Código e nome são obrigatórios"); return; }
    if (editingId) { updateMutation.mutate({ id: editingId, ...form }); }
    else { createMutation.mutate(form); }
  }

  const iconOptions = ["⚡", "🔧", "🧹", "👷", "📉", "🏠", "💧", "🔥", "📦", "🛡️"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FolderCog className="w-6 h-6" />Configuração de Categorias de Custos Indiretos</h1>
          <p className="text-muted-foreground">Gerencie as categorias disponíveis para classificação dos custos indiretos mensais</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Categoria</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias Cadastradas</CardTitle>
          <CardDescription>{categories.data?.length || 0} categoria(s) cadastrada(s)</CardDescription>
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
              {categories.data?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xl">{c.icon || "⚡"}</TableCell>
                  <TableCell className="font-mono">{c.code}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: c.color || "#F59E0B" }} />
                      <span className="text-xs font-mono">{c.color || "#F59E0B"}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => openEdit(c)}><Pencil className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Excluir esta categoria?")) deleteMutation.mutate({ id: c.id }); }}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!categories.data || categories.data.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma categoria cadastrada. Clique em "Nova Categoria" para começar.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar Categoria" : "Nova Categoria de Custo Indireto"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ex: CONSULTORIA" maxLength={20} /></div>
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Consultoria" /></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição da categoria" /></div>
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
