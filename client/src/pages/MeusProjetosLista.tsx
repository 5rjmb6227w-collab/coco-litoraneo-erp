import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Download, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "planejamento", label: "Planejamento" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "pausado", label: "Pausado" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];
const CATEGORY_OPTIONS = [
  { value: "all", label: "Todas as Categorias" },
  { value: "equipamento", label: "Equipamento" },
  { value: "obra", label: "Obra" },
  { value: "insumo", label: "Insumo" },
  { value: "processo", label: "Processo" },
  { value: "comercial", label: "Comercial" },
  { value: "outro", label: "Outro" },
];
const PRIORITY_OPTIONS = [
  { value: "all", label: "Todas as Prioridades" },
  { value: "critica", label: "Crítica" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

export default function MeusProjetosLista() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === 'admin' || user?.role === 'ceo';
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string>("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", category: "equipamento", priority: "media", budgetPlanned: "" });
  const ITEMS_PER_PAGE = 10;

  const projectsQuery = trpc.strategic.projects.list.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    category: categoryFilter !== "all" ? categoryFilter as any : undefined,
    priority: priorityFilter !== "all" ? priorityFilter as any : undefined,
    search: searchText || undefined,
  });
  const createMutation = trpc.strategic.projects.create.useMutation();
  const rawData = (projectsQuery.data as any)?.data || projectsQuery.data || [];
  const projects = Array.isArray(rawData) ? rawData : [];

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "title": aVal = a.title; bVal = b.title; break;
        case "category": aVal = a.category || ""; bVal = b.category || ""; break;
        case "priority": { const o: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }; aVal = o[a.priority] ?? 9; bVal = o[b.priority] ?? 9; break; }
        case "status": aVal = a.status; bVal = b.status; break;
        case "progress": aVal = a.progress || 0; bVal = b.progress || 0; break;
        case "budget": aVal = a.budgetPlanned || 0; bVal = b.budgetPlanned || 0; break;
        case "dueDate": aVal = a.targetEndDate ? new Date(a.targetEndDate).getTime() : 0; bVal = b.targetEndDate ? new Date(b.targetEndDate).getTime() : 0; break;
        default: aVal = a.title; bVal = b.title;
      }
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [projects, sortField, sortDir]);

  const totalPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = sortedProjects.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSort = (field: string) => { if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDir("asc"); } };
  const clearFilters = () => { setStatusFilter("all"); setCategoryFilter("all"); setPriorityFilter("all"); setSearchText(""); setPage(1); };

  const handleExportCSV = () => {
    const headers = ["Código", "Título", "Categoria", "Prioridade", "Status", "Progresso", "Orçamento Previsto", "Orçamento Realizado", "Prazo"];
    const rows = sortedProjects.map(p => [p.code || "", p.title, p.category || "", p.priority, p.status, `${p.progress || 0}%`, (p.budgetPlanned || 0).toString(), (p.budgetActual || 0).toString(), p.targetEndDate ? new Date(p.targetEndDate).toLocaleDateString("pt-BR") : ""]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "projetos-estrategicos.csv"; a.click(); URL.revokeObjectURL(url);
  };

  // 7c) Atalhos de teclado - Ctrl+N abre novo projeto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setIsDialogOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreate = async () => {
    if (!formData.title.trim()) return;
    try {
      const p = await createMutation.mutateAsync({ title: formData.title, description: formData.description || undefined, category: formData.category as any, priority: formData.priority as any, budgetPlanned: formData.budgetPlanned || undefined });
      setIsDialogOpen(false); setFormData({ title: "", description: "", category: "equipamento", priority: "media", budgetPlanned: "" });
      toast.success("Projeto criado com sucesso!");
      await projectsQuery.refetch(); navigate(`/projetos/${p.id}`);
    } catch (e) { toast.error("Erro ao criar projeto"); console.error(e); }
  };

  const getStatusColor = (s: string) => ({ planejamento: "bg-slate-100 text-slate-800", andamento: "bg-blue-100 text-blue-800", em_andamento: "bg-blue-100 text-blue-800", pausado: "bg-amber-100 text-amber-800", concluido: "bg-green-100 text-green-800", cancelado: "bg-red-100 text-red-800" }[s] || "bg-gray-100 text-gray-800");
  const getPriorityColor = (p: string) => ({ critica: "bg-red-100 text-red-800", alta: "bg-orange-100 text-orange-800", media: "bg-blue-100 text-blue-800", baixa: "bg-gray-100 text-gray-800" }[p] || "bg-gray-100 text-gray-800");

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">{label}<ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-[#8B7355]" : "text-muted-foreground/50"}`} /></div>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Todos os Projetos</h1>
            {isGlobalAdmin && (
              <Badge className="bg-amber-100 text-amber-800 text-xs">Visão Global</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {sortedProjects.length} projeto(s) encontrado(s)
            {isGlobalAdmin ? ' — Visão completa da organização' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          <Button onClick={() => setIsDialogOpen(true)} className="bg-[#8B7355] hover:bg-[#5D4E37]"><Plus className="w-4 h-4 mr-2" />Novo Projeto</Button>
        </div>
      </div>

      <Card><CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Buscar..." value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1); }} className="pl-9" /></div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
          <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
          <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground"><X className="w-4 h-4 mr-1" />Limpar</Button>
        </div>
      </CardContent></Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b"><tr>
              <SortHeader field="title" label="Título" />
              <SortHeader field="category" label="Categoria" />
              <SortHeader field="priority" label="Prioridade" />
              <SortHeader field="status" label="Status" />
              <SortHeader field="progress" label="Progresso" />
              <SortHeader field="budget" label="Orçamento" />
              <SortHeader field="dueDate" label="Prazo" />
            </tr></thead>
            <tbody className="divide-y">
              {paginatedProjects.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <FolderKanban className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <h4 className="font-medium mb-1">Nenhum projeto encontrado</h4>
                  <p className="text-sm text-muted-foreground mb-4">Crie um novo projeto ou ajuste os filtros de busca.</p>
                  <Button size="sm" onClick={() => setIsDialogOpen(true)} className="bg-[#8B7355] hover:bg-[#5D4E37]">
                    <Plus className="w-4 h-4 mr-1" />Novo Projeto
                  </Button>
                </td></tr>
              ) : paginatedProjects.map(project => (
                <tr key={project.id} onClick={() => navigate(`/projetos/${project.id}`)} className="hover:bg-accent/50 cursor-pointer transition">
                  <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{project.code}</span><p className="font-medium text-sm">{project.title}</p></td>
                  <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{project.category || "—"}</Badge></td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${getPriorityColor(project.priority)}`}>{project.priority}</Badge></td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${getStatusColor(project.status)}`}>{project.status}</Badge></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-16 bg-gray-200 rounded-full h-2"><div className="bg-[#8B7355] h-2 rounded-full" style={{ width: `${project.progress || 0}%` }} /></div><span className="text-xs text-muted-foreground">{project.progress || 0}%</span></div></td>
                  <td className="px-4 py-3"><div className="text-xs"><p>R$ {(parseFloat(String(project.budgetPlanned || 0)) / 1000).toFixed(1)}k</p><p className="text-muted-foreground">R$ {(parseFloat(String(project.budgetActual || 0)) / 1000).toFixed(1)}k real</p></div></td>
                  <td className="px-4 py-3">{project.targetEndDate ? <span className={`text-xs ${new Date(project.targetEndDate) < new Date() && project.status !== "concluido" ? "text-red-600 font-medium" : "text-muted-foreground"}`}>{new Date(project.targetEndDate).toLocaleDateString("pt-BR")}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, sortedProjects.length)} de {sortedProjects.length}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i; if (n > totalPages) return null; return <Button key={n} variant={n === page ? "default" : "outline"} size="sm" onClick={() => setPage(n)} className={n === page ? "bg-[#8B7355]" : ""}>{n}</Button>; })}
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input placeholder="Ex: Forno de Secagem" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea placeholder="Descrição..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Categoria</Label><Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="equipamento">Equipamento</SelectItem><SelectItem value="obra">Obra</SelectItem><SelectItem value="insumo">Insumo</SelectItem><SelectItem value="processo">Processo</SelectItem><SelectItem value="comercial">Comercial</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent></Select></div>
              <div><Label>Prioridade</Label><Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critica">Crítica</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Orçamento Previsto (R$)</Label><Input type="number" placeholder="0.00" value={formData.budgetPlanned} onChange={e => setFormData({ ...formData, budgetPlanned: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-[#8B7355] hover:bg-[#5D4E37]">{createMutation.isPending ? "Criando..." : "Criar Projeto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
