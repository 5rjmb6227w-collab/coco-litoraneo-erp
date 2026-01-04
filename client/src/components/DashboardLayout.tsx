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
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
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
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "Operações",
    items: [
      { icon: Truck, label: "Recebimento", path: "/recebimento" },
      { icon: Users, label: "Produtores", path: "/produtores" },
      { icon: Wallet, label: "Pagamentos", path: "/pagamentos" },
    ],
  },
  {
    label: "Produção",
    items: [
      { icon: Factory, label: "Apontamentos", path: "/producao/apontamentos" },
      { icon: AlertTriangle, label: "Problemas do Dia", path: "/producao/problemas" },
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
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: ShoppingCart, label: "Compras", path: "/compras" },
      { icon: DollarSign, label: "Financeiro", path: "/financeiro" },
    ],
  },
  {
    label: "Qualidade",
    items: [
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
      { icon: Bell, label: "Alertas", path: "/admin/alertas" },
      { icon: Settings, label: "Configurações", path: "/admin/configuracoes" },
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
          alt="Coqueiros"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay gradiente para melhor legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        
        {/* Conteúdo do login posicionado na parte inferior */}
        <div className="absolute inset-0 flex items-end justify-center pb-16 px-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-10 w-full max-w-md">
            <div className="flex flex-col items-center gap-6">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-100 to-amber-300 flex items-center justify-center shadow-xl border-4 border-white">
                <span className="text-6xl">🥥</span>
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                  Coco Litorâneo
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  Sistema de Gestão Integrada
                </p>
              </div>
              <Button
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
                size="lg"
                className="w-full bg-amber-700 hover:bg-amber-800 text-white shadow-lg hover:shadow-xl transition-all py-6 text-lg font-semibold rounded-xl"
              >
                Entrar no Sistema
              </Button>
              <p className="text-sm text-gray-500 text-center">
                Acesso restrito a usuários autorizados
              </p>
            </div>
          </div>
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
  const [openGroups, setOpenGroups] = useState<string[]>(["Principal", "Operações", "Produção", "Almoxarifado", "Estoque", "Gestão", "Qualidade", "Pessoas"]);

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
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 bg-background min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
