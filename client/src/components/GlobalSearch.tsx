import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  User, 
  Truck, 
  Package, 
  CreditCard, 
  FileText, 
  Users,
  LayoutDashboard,
  ClipboardList,
  Warehouse,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Settings,
  BarChart3,
  Calendar,
  Bot,
  Loader2
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "page" | "producer" | "load" | "product" | "payment" | "employee" | "nc";
  title: string;
  subtitle?: string;
  path: string;
  icon: React.ReactNode;
}

// Páginas do sistema para navegação rápida
const systemPages: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard Geral", path: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "dashboard-ceo", type: "page", title: "Dashboard CEO", path: "/dashboard-ceo", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "dashboard-gerente", type: "page", title: "Dashboard Gerente", path: "/dashboard-gerente", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "dashboard-operador", type: "page", title: "Dashboard Operador", path: "/dashboard-operador", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "recebimento", type: "page", title: "Recebimento de Cargas", path: "/recebimento", icon: <Truck className="h-4 w-4" /> },
  { id: "produtores", type: "page", title: "Produtores", path: "/produtores", icon: <User className="h-4 w-4" /> },
  { id: "pagamentos", type: "page", title: "Pagamentos a Produtores", path: "/pagamentos", icon: <CreditCard className="h-4 w-4" /> },
  { id: "ranking", type: "page", title: "Ranking de Produtores", path: "/ranking-produtores", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "apontamentos", type: "page", title: "Apontamentos de Produção", path: "/apontamentos", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "problemas", type: "page", title: "Problemas do Dia", path: "/problemas-dia", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "op-metas", type: "page", title: "OP & Metas", path: "/op-metas", icon: <FileText className="h-4 w-4" /> },
  { id: "calendario", type: "page", title: "Calendário de Produção", path: "/calendario-producao", icon: <Calendar className="h-4 w-4" /> },
  { id: "bom", type: "page", title: "BOM / Receitas", path: "/bom", icon: <FileText className="h-4 w-4" /> },
  { id: "insumos", type: "page", title: "Insumos de Produção", path: "/insumos-producao", icon: <Package className="h-4 w-4" /> },
  { id: "itens-gerais", type: "page", title: "Itens Gerais", path: "/itens-gerais", icon: <Package className="h-4 w-4" /> },
  { id: "produto-acabado", type: "page", title: "Produto Acabado", path: "/produto-acabado", icon: <Package className="h-4 w-4" /> },
  { id: "lotes", type: "page", title: "Gestão de Lotes", path: "/lotes", icon: <Warehouse className="h-4 w-4" /> },
  { id: "rastreabilidade", type: "page", title: "Rastreabilidade", path: "/rastreabilidade", icon: <Search className="h-4 w-4" /> },
  { id: "compras", type: "page", title: "Compras", path: "/compras", icon: <ShoppingCart className="h-4 w-4" /> },
  { id: "financeiro", type: "page", title: "Financeiro", path: "/financeiro", icon: <DollarSign className="h-4 w-4" /> },
  { id: "custos", type: "page", title: "Custos", path: "/custos", icon: <DollarSign className="h-4 w-4" /> },
  { id: "relatorios", type: "page", title: "Relatórios", path: "/relatorios", icon: <FileText className="h-4 w-4" /> },
  { id: "hist-precos", type: "page", title: "Histórico de Preços", path: "/historico-precos", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "orcamento", type: "page", title: "Orçamento", path: "/orcamento", icon: <DollarSign className="h-4 w-4" /> },
  { id: "dashboard-qualidade", type: "page", title: "Dashboard Qualidade", path: "/dashboard-qualidade", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "analises", type: "page", title: "Análises de Qualidade", path: "/analises", icon: <FileText className="h-4 w-4" /> },
  { id: "ncs", type: "page", title: "Não Conformidades", path: "/nao-conformidades", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "colaboradores", type: "page", title: "Colaboradores", path: "/colaboradores", icon: <Users className="h-4 w-4" /> },
  { id: "ocorrencias", type: "page", title: "Ocorrências", path: "/ocorrencias", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "usuarios", type: "page", title: "Usuários", path: "/usuarios", icon: <Users className="h-4 w-4" /> },
  { id: "logs", type: "page", title: "Logs de Auditoria", path: "/logs-auditoria", icon: <FileText className="h-4 w-4" /> },
  { id: "alertas", type: "page", title: "Central de Alertas", path: "/alertas", icon: <AlertTriangle className="h-4 w-4" /> },
  { id: "configuracoes", type: "page", title: "Configurações", path: "/configuracoes", icon: <Settings className="h-4 w-4" /> },
  { id: "copiloto", type: "page", title: "Copiloto IA", path: "/copiloto", icon: <Bot className="h-4 w-4" /> },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Queries para busca em dados
  const { data: producers, isLoading: loadingProducers } = trpc.producers.list.useQuery(
    { search: query },
    { enabled: open && query.length >= 2 }
  );

  const { data: employees, isLoading: loadingEmployees } = trpc.employees.list.useQuery(
    { search: query },
    { enabled: open && query.length >= 2 }
  );

  // Atalho de teclado Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtrar resultados
  const getResults = useCallback((): SearchResult[] => {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Filtrar páginas
    const filteredPages = systemPages.filter(
      page => page.title.toLowerCase().includes(lowerQuery)
    );
    results.push(...filteredPages.slice(0, 5));

    // Adicionar produtores
    if (producers && query.length >= 2) {
      const producerResults: SearchResult[] = producers.slice(0, 5).map(p => ({
        id: `producer-${p.id}`,
        type: "producer" as const,
        title: p.name,
        subtitle: p.cpfCnpj || undefined,
        path: `/produtores?id=${p.id}`,
        icon: <User className="h-4 w-4" />,
      }));
      results.push(...producerResults);
    }

    // Adicionar colaboradores
    if (employees && query.length >= 2) {
      const employeeResults: SearchResult[] = employees.slice(0, 5).map(e => ({
        id: `employee-${e.id}`,
        type: "employee" as const,
        title: e.fullName,
        subtitle: e.position || undefined,
        path: `/colaboradores?id=${e.id}`,
        icon: <Users className="h-4 w-4" />,
      }));
      results.push(...employeeResults);
    }

    return results;
  }, [query, producers, employees]);

  const results = getResults();
  const isLoading = loadingProducers || loadingEmployees;

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex]);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const handleSelect = (result: SearchResult) => {
    setLocation(result.path);
    setOpen(false);
  };

  const getTypeBadge = (type: SearchResult["type"]) => {
    const badges: Record<SearchResult["type"], { label: string; variant: "default" | "secondary" | "outline" }> = {
      page: { label: "Página", variant: "default" },
      producer: { label: "Produtor", variant: "secondary" },
      load: { label: "Carga", variant: "outline" },
      product: { label: "Produto", variant: "outline" },
      payment: { label: "Pagamento", variant: "outline" },
      employee: { label: "Colaborador", variant: "secondary" },
      nc: { label: "NC", variant: "outline" },
    };
    return badges[type];
  };

  return (
    <>
      {/* Botão de busca */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md border border-border/50 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Modal de busca */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden">
          {/* Campo de busca */}
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input
              placeholder="Buscar páginas, produtores, colaboradores..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
              autoFocus
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Resultados */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {query.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>Digite para buscar páginas, produtores, colaboradores...</p>
                <p className="mt-2 text-xs">
                  Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑</kbd>{" "}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↓</kbd> para navegar e{" "}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> para selecionar
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado para "{query}"
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => {
                  const badge = getTypeBadge(result.type);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                        index === selectedIndex
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className={index === selectedIndex ? "text-primary-foreground" : "text-muted-foreground"}>
                        {result.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.title}</div>
                        {result.subtitle && (
                          <div className={`text-xs truncate ${
                            index === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}>
                            {result.subtitle}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={index === selectedIndex ? "outline" : badge.variant}
                        className={index === selectedIndex ? "border-primary-foreground/30 text-primary-foreground" : ""}
                      >
                        {badge.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">↵</kbd> selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">esc</kbd> fechar
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
