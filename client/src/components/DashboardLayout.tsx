import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Truck, 
  Users, 
  Wallet, 
  Package, 
  Boxes, 
  Archive,
  ChevronDown,
  Factory,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  FlaskConical,
  ClipboardList,
  UserCog,
  Shield,
  UserCheck,
  Activity,
  FileText,
  Settings,
  Bell,
  Bot,
  Sparkles,
  Cog,
  Target,
  CheckSquare,
  Lock,
  Sun,
  Moon,
  Calculator,
  Calendar as CalendarIcon,
  TrendingUp,
  CheckCircle,
  BarChart3,
  Box,
  QrCode,
  Layers,
  Award,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearch } from './GlobalSearch';
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Menu items organizados por grupos
const menuGroups: Array<{
  label: string;
  adminOnly?: boolean;
  items: Array<{ icon: any; label: string; path: string }>;
}> = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard Geral", path: "/" },
      { icon: Target, label: "Dashboard CEO", path: "/dashboard/ceo" },
      { icon: Factory, label: "Dashboard Gerente", path: "/dashboard/gerente" },
      { icon: Activity, label: "Dashboard Operador", path: "/dashboard/operador" },
    ],
  },
  {
    label: "Operações",
    items: [
      { icon: Truck, label: "Recebimento", path: "/recebimento" },
      { icon: Users, label: "Produtores", path: "/produtores" },
      { icon: Wallet, label: "Pagamentos", path: "/pagamentos" },
      { icon: Activity, label: "Ranking Produtores", path: "/ranking-produtores" },
    ],
  },
  {
    label: "Produção",
    items: [
      { icon: Factory, label: "Apontamentos", path: "/producao/apontamentos" },
      { icon: AlertTriangle, label: "Problemas do Dia", path: "/producao/problemas" },
      { icon: Target, label: "OP & Metas", path: "/producao/expandida" },
      { icon: CalendarIcon, label: "Calendário", path: "/producao/calendario" },
      { icon: Layers, label: "BOM / Receitas", path: "/bom-receitas" },
    ],
  },
  {
    label: "Almoxarifado",
    items: [
      { icon: Package, label: "Insumos Produção", path: "/almoxarifado/producao" },
      { icon: Boxes, label: "Itens Gerais", path: "/almoxarifado/geral" },
    ],
  },
  {
    label: "Estoque",
    items: [
      { icon: Archive, label: "Produto Acabado", path: "/estoque" },
      { icon: Package, label: "Cadastro Produtos", path: "/cadastro/produtos" },
      { icon: Box, label: "Gestão de Lotes", path: "/lotes" },
      { icon: QrCode, label: "Rastreabilidade", path: "/rastreabilidade" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: ShoppingCart, label: "Compras", path: "/compras" },
      { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
      { icon: Calculator, label: "Custos", path: "/custos" },
      { icon: FileText, label: "Relatórios", path: "/relatorios" },
      { icon: ShoppingCart, label: "Nec. Compra", path: "/relatorios/necessidade-compra" },
      { icon: TrendingUp, label: "Hist. Preços", path: "/historico-precos" },
    ],
  },
  {
    label: "Orçamento",
    items: [
      { icon: Target, label: "Preparação", path: "/orcamento/preparacao" },
      { icon: Activity, label: "Acompanhamento", path: "/orcamento/acompanhamento" },
      { icon: Bot, label: "Análise IA", path: "/orcamento/analise-ia" },
      { icon: BarChart3, label: "Cenários", path: "/orcamento/cenarios" },
      { icon: DollarSign, label: "CAPEX", path: "/orcamento/capex" },
      { icon: TrendingUp, label: "Forecast", path: "/orcamento/forecast" },
      { icon: CheckCircle, label: "Aprovação", path: "/orcamento/aprovacao" },
      { icon: FileText, label: "Relatórios", path: "/orcamento/relatorios" },
    ],
  },
  {
    label: "Qualidade",
    items: [
      { icon: Award, label: "Dashboard Qualidade", path: "/qualidade/dashboard" },
      { icon: FlaskConical, label: "Análises", path: "/qualidade/analises" },
      { icon: ClipboardList, label: "Não Conformidades", path: "/qualidade/ncs" },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { icon: UserCog, label: "Colaboradores", path: "/rh/colaboradores" },
      { icon: ClipboardList, label: "Ocorrências", path: "/rh/ocorrencias" },
    ],
  },
  {
    label: "Administração",
    adminOnly: true,
    items: [
      { icon: Users, label: "Usuários", path: "/admin/usuarios" },
      { icon: Activity, label: "Usuários Online", path: "/admin/online" },
      { icon: FileText, label: "Logs de Auditoria", path: "/admin/logs" },
      { icon: Bell, label: "Central de Alertas", path: "/alertas" },
      { icon: Settings, label: "Configurações", path: "/admin/configuracoes" },
      { icon: Lock, label: "Segurança", path: "/admin/seguranca" },
    ],
  },
  {
    label: "Copiloto IA",
    adminOnly: true,
    items: [
      { icon: Bot, label: "Agentes de IA", path: "/ia/agentes" },
      { icon: Sparkles, label: "Momentos Mágicos", path: "/ia/momentos-magicos" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        {/* Imagem de fundo ocupando TODA a tela */}
        <img 
          src="/coqueiros-banner.webp" 
          alt="Coqueiros - Coco Litorâneo"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay gradiente sutil na parte inferior para o botão */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        {/* Apenas o botão posicionado na parte inferior */}
        <div className="absolute inset-x-0 bottom-8 flex justify-center px-4">
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="px-12 py-6 text-lg font-bold rounded-xl shadow-2xl transition-all hover:scale-105"
            style={{
              backgroundColor: '#8B7355',
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6B5A45';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#8B7355';
            }}
          >
            Entrar no Sistema
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { theme, toggleTheme, switchable } = useTheme();
  const [openGroups, setOpenGroups] = useState<string[]>(["Principal", "Operações", "Produção", "Almoxarifado", "Estoque", "Gestão", "Qualidade", "Pessoas", "Administração", "Copiloto IA"]);

  // Find active menu item
  const activeMenuItem = menuGroups.flatMap(g => g.items).find(item => item.path === location);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => 
      prev.includes(label) 
        ? prev.filter(g => g !== label)
        : [...prev, label]
    );
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">🥥</span>
                  <span className="font-semibold tracking-tight truncate text-foreground">
                    Coco Litorâneo
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            {menuGroups
              .filter(group => !group.adminOnly || user?.role === 'ceo' || user?.role === 'admin')
              .map((group) => (
              <Collapsible
                key={group.label}
                open={openGroups.includes(group.label)}
                onOpenChange={() => toggleGroup(group.label)}
              >
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group-data-[collapsible=icon]:hidden">
                      {group.label}
                      <ChevronDown className={`h-3 w-3 transition-transform ${openGroups.includes(group.label) ? '' : '-rotate-90'}`} />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu className="px-2">
                        {group.items.map(item => {
                          const isActive = location === item.path;
                          return (
                            <SidebarMenuItem key={item.path}>
                              <SidebarMenuButton
                                isActive={isActive}
                                onClick={() => setLocation(item.path)}
                                tooltip={item.label}
                                className={`h-9 transition-all font-normal ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                              >
                                <item.icon
                                  className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                                />
                                <span>{item.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            {/* Busca Global */}
            {!isCollapsed && (
              <div className="mb-2">
                <GlobalSearch />
              </div>
            )}
            {/* Barra de ações rápidas */}
            <div className="flex items-center justify-between mb-2 group-data-[collapsible=icon]:justify-center">
              <NotificationCenter />
              {!isCollapsed && switchable && toggleTheme && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-8 w-8"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-foreground">
                      {user?.name || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user?.role === "ceo" || user?.role === "admin" ? "Administrador" : "Usuário"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {switchable && toggleTheme && (
                  <DropdownMenuItem
                    onClick={toggleTheme}
                    className="cursor-pointer"
                  >
                    {theme === "dark" ? (
                      <><Sun className="mr-2 h-4 w-4" /><span>Tema Claro</span></>
                    ) : (
                      <><Moon className="mr-2 h-4 w-4" /><span>Tema Escuro</span></>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <span className="text-xl">🥥</span>
                <div className="flex flex-col gap-0.5">
                  <span className="tracking-tight text-foreground font-medium">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearch />
              <NotificationCenter />
              {switchable && toggleTheme && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-9 w-9"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}
              <LanguageSwitcher variant="compact" />
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 bg-background min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
