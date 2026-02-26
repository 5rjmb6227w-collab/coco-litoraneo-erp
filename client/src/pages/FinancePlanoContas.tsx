import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, ChevronRight, ChevronDown, BookOpen, Layers, Edit2, Trash2,
  Database, Filter, Search, RefreshCw, FolderTree
} from "lucide-react";

type AccountNode = {
  id: number;
  code: string;
  name: string;
  nature: string;
  type: string;
  level: number;
  parentId: number | null;
  description: string | null;
  isActive: boolean;
  acceptsEntries: boolean;
  displayOrder: number | null;
  children: AccountNode[];
};

const NATURE_LABELS: Record<string, string> = {
  ativo: "Ativo",
  passivo: "Passivo",
  receita: "Receita",
  despesa: "Despesa",
  patrimonio_liquido: "Patrimônio Líquido",
};

const NATURE_COLORS: Record<string, string> = {
  ativo: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  passivo: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  receita: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  despesa: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  patrimonio_liquido: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

function AccountTreeNode({
  node,
  onEdit,
  onDelete,
  onAddChild,
  searchTerm,
}: {
  node: AccountNode;
  onEdit: (acc: AccountNode) => void;
  onDelete: (id: number) => void;
  onAddChild: (parent: AccountNode) => void;
  searchTerm: string;
}) {
  const [expanded, setExpanded] = useState(node.level <= 2);
  const hasChildren = node.children.length > 0;

  const matchesSearch = searchTerm
    ? node.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.name.toLowerCase().includes(searchTerm.toLowerCase())
    : true;

  const childMatchesSearch = searchTerm
    ? JSON.stringify(node.children).toLowerCase().includes(searchTerm.toLowerCase())
    : false;

  if (searchTerm && !matchesSearch && !childMatchesSearch) return null;

  return (
    <div className="w-full">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 group ${
          !node.isActive ? "opacity-50" : ""
        }`}
        style={{ paddingLeft: `${(node.level - 1) * 24 + 8}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="w-4" />
          )}
        </button>

        <span className="font-mono text-sm text-muted-foreground w-20 shrink-0">{node.code}</span>
        <span className={`text-sm flex-1 ${node.type === "sintetica" ? "font-semibold" : ""}`}>
          {node.name}
        </span>

        <Badge variant="outline" className={`text-xs ${NATURE_COLORS[node.nature] || ""}`}>
          {NATURE_LABELS[node.nature] || node.nature}
        </Badge>

        {node.type === "analitica" && (
          <Badge variant="secondary" className="text-xs">Analítica</Badge>
        )}

        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          {node.type === "sintetica" && node.level < 5 && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddChild(node)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          {!hasChildren && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(node.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <AccountTreeNode
              key={child.id}
              node={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FinancePlanoContas() {
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountNode | null>(null);
  const [parentForNew, setParentForNew] = useState<AccountNode | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNature, setFilterNature] = useState<string>("all");

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nature: "ativo" as "ativo" | "passivo" | "receita" | "despesa" | "patrimonio_liquido",
    type: "analitica" as "analitica" | "sintetica",
    level: 1,
    parentId: null as number | null,
    description: "",
    acceptsEntries: true,
    isActive: true,
  });

  const utils = trpc.useUtils();
  const treeQuery = trpc.finance.chartOfAccounts.getTree.useQuery({ isActive: filterNature === "inactive" ? false : undefined });
  const flatQuery = trpc.finance.chartOfAccounts.list.useQuery();

  const createMutation = trpc.finance.chartOfAccounts.create.useMutation({
    onSuccess: () => {
      toast.success("Conta criada com sucesso");
      utils.finance.chartOfAccounts.invalidate();
      setShowModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.finance.chartOfAccounts.update.useMutation({
    onSuccess: () => {
      toast.success("Conta atualizada com sucesso");
      utils.finance.chartOfAccounts.invalidate();
      setShowModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.finance.chartOfAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success("Conta excluída com sucesso");
      utils.finance.chartOfAccounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const seedMutation = trpc.finance.chartOfAccounts.seedDefault.useMutation({
    onSuccess: (data) => {
      toast.success(`Plano de contas padrão criado com ${data.totalAccounts} contas`);
      utils.finance.chartOfAccounts.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const tree = treeQuery.data || [];
  const flatList = flatQuery.data || [];

  const stats = useMemo(() => {
    return {
      total: flatList.length,
      sinteticas: flatList.filter(a => a.type === "sintetica").length,
      analiticas: flatList.filter(a => a.type === "analitica").length,
      ativas: flatList.filter(a => a.isActive).length,
    };
  }, [flatList]);

  const filteredTree = useMemo(() => {
    if (filterNature === "all" || filterNature === "inactive") return tree;
    return tree.filter(node => node.nature === filterNature);
  }, [tree, filterNature]);

  function openNewModal(parent?: AccountNode) {
    setEditingAccount(null);
    setParentForNew(parent || null);
    setFormData({
      code: parent ? `${parent.code}.` : "",
      name: "",
      nature: (parent?.nature || "ativo") as "ativo" | "passivo" | "receita" | "despesa" | "patrimonio_liquido",
      type: "analitica" as "analitica" | "sintetica",
      level: parent ? parent.level + 1 : 1,
      parentId: parent?.id || null,
      description: "",
      acceptsEntries: true,
      isActive: true,
    });
    setShowModal(true);
  }

  function openEditModal(account: AccountNode) {
    setEditingAccount(account);
    setParentForNew(null);
    setFormData({
      code: account.code,
      name: account.name,
      nature: account.nature as "ativo" | "passivo" | "receita" | "despesa" | "patrimonio_liquido",
      type: account.type as "analitica" | "sintetica",
      level: account.level,
      parentId: account.parentId,
      description: account.description || "",
      acceptsEntries: account.acceptsEntries,
      isActive: account.isActive,
    });
    setShowModal(true);
  }

  function handleSubmit() {
    if (editingAccount) {
      updateMutation.mutate({
        id: editingAccount.id,
        ...formData,
        description: formData.description || undefined,
      });
    } else {
      createMutation.mutate({
        ...formData,
        description: formData.description || undefined,
        acceptsEntries: formData.type === "analitica",
      });
    }
  }

  function handleDelete(id: number) {
    if (confirm("Tem certeza que deseja excluir esta conta?")) {
      deleteMutation.mutate({ id });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Plano de Contas
          </h1>
          <p className="text-muted-foreground mt-1">
            Estrutura hierárquica de contas contábeis
          </p>
        </div>
        <div className="flex gap-2">
          {flatList.length === 0 && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              <Database className="h-4 w-4 mr-2" />
              {seedMutation.isPending ? "Criando..." : "Carregar Plano Padrão"}
            </Button>
          )}
          <Button onClick={() => openNewModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total de Contas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.sinteticas}</div>
            <div className="text-xs text-muted-foreground">Sintéticas (Grupos)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.analiticas}</div>
            <div className="text-xs text-muted-foreground">Analíticas (Lançamento)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.ativas}</div>
            <div className="text-xs text-muted-foreground">Contas Ativas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterNature} onValueChange={setFilterNature}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Naturezas</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="passivo">Passivo</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="patrimonio_liquido">Patrimônio Líquido</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => utils.finance.chartOfAccounts.invalidate()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tree */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Estrutura de Contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {treeQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredTree.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma conta cadastrada</h3>
              <p className="text-muted-foreground mt-1">
                Clique em "Carregar Plano Padrão" para iniciar com o plano de contas brasileiro padrão.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg divide-y">
              {filteredTree.map((node) => (
                <AccountTreeNode
                  key={node.id}
                  node={node as AccountNode}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onAddChild={openNewModal}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Editar Conta" : parentForNew ? `Nova Subconta de ${parentForNew.code} - ${parentForNew.name}` : "Nova Conta"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="1.1.01"
                />
              </div>
              <div>
                <Label>Nível</Label>
                <Input type="number" value={formData.level} onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })} min={1} max={5} />
              </div>
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da conta"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Natureza *</Label>
                <Select value={formData.nature} onValueChange={(v) => setFormData({ ...formData, nature: v as "ativo" | "passivo" | "receita" | "despesa" | "patrimonio_liquido" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="passivo">Passivo</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="patrimonio_liquido">Patrimônio Líquido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as "analitica" | "sintetica" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sintetica">Sintética (Grupo)</SelectItem>
                    <SelectItem value="analitica">Analítica (Lançamento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
            {editingAccount && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive">Conta ativa</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !formData.code || !formData.name}
            >
              {editingAccount ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
