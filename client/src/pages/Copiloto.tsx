/**
 * Copiloto IA - Página principal com abas
 * Mobile-first com gestos swipe, dark mode adaptável e PWA ready
 */

import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Bot, MessageSquare, Lightbulb, Bell, ListTodo, Settings, Brain,
  Menu, ChevronLeft, ChevronRight, Wifi, WifiOff, Download
} from "lucide-react";
import { ChatPanel } from "@/components/copilot/ChatPanel";
import { InsightCards } from "@/components/copilot/InsightCards";
import { AlertsTable } from "@/components/copilot/AlertsTable";
import { ActionsQueue } from "@/components/copilot/ActionsQueue";
import { CopilotSettings } from "@/components/copilot/CopilotSettings";
import { PredictionsDashboard } from "@/components/copilot/PredictionsDashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

// Hook para detectar gestos swipe
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      onSwipeLeft();
    } else if (isRightSwipe) {
      onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);
}

// Hook para detectar status online/offline
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook para detectar se é mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

// Hook para detectar se PWA pode ser instalado
function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promptEvent = installPrompt as any;
    promptEvent.prompt();
    await promptEvent.userChoice;
    setInstallPrompt(null);
  };

  return { canInstall: !!installPrompt, isInstalled, promptInstall };
}

const TABS = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "alerts", label: "Alertas", icon: Bell },
  { id: "actions", label: "Ações", icon: ListTodo },
  { id: "predictions", label: "Previsões", icon: Brain },
  { id: "config", label: "Config", icon: Settings, adminOnly: true },
];

export default function Copiloto() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("chat");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isAdmin = user?.role === "admin" || user?.role === "ceo";
  const isOnline = useOnlineStatus();
  const isMobile = useIsMobile();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  // Filtrar tabs baseado em permissão
  const availableTabs = TABS.filter(tab => !tab.adminOnly || isAdmin);
  
  // Índice da tab atual
  const currentTabIndex = availableTabs.findIndex(t => t.id === activeTab);

  // Navegação por swipe
  const goToNextTab = useCallback(() => {
    const nextIndex = Math.min(currentTabIndex + 1, availableTabs.length - 1);
    setActiveTab(availableTabs[nextIndex].id);
  }, [currentTabIndex, availableTabs]);

  const goToPrevTab = useCallback(() => {
    const prevIndex = Math.max(currentTabIndex - 1, 0);
    setActiveTab(availableTabs[prevIndex].id);
  }, [currentTabIndex, availableTabs]);

  // Habilitar swipe apenas em mobile
  useSwipe(
    isMobile ? goToNextTab : () => {},
    isMobile ? goToPrevTab : () => {}
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header Mobile-First */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100">
                Copiloto IA
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 hidden sm:block">
                Assistente inteligente do Coco Litorâneo
              </p>
            </div>
          </div>

          {/* Status e Ações Mobile */}
          <div className="flex items-center gap-2">
            {/* Indicador Online/Offline */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              isOnline 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
            </div>

            {/* Botão Instalar PWA */}
            {canInstall && !isInstalled && (
              <Button
                variant="outline"
                size="sm"
                onClick={promptInstall}
                className="gap-1 text-xs"
              >
                <Download className="h-3 w-3" />
                <span className="hidden sm:inline">Instalar</span>
              </Button>
            )}

            {/* Menu Mobile (Sheet) */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="sm:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col gap-2 mt-6">
                    <h3 className="font-semibold text-stone-700 dark:text-stone-200 mb-2">
                      Navegação
                    </h3>
                    {availableTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <Button
                          key={tab.id}
                          variant={activeTab === tab.id ? "default" : "ghost"}
                          className="justify-start gap-2"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </Button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        {/* Indicador de Swipe (Mobile) */}
        {isMobile && (
          <div className="flex items-center justify-between px-2 mb-2 text-xs text-stone-400">
            <button 
              onClick={goToPrevTab}
              disabled={currentTabIndex === 0}
              className="flex items-center gap-1 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              {currentTabIndex > 0 && availableTabs[currentTabIndex - 1].label}
            </button>
            <span className="font-medium text-stone-600 dark:text-stone-300">
              {availableTabs[currentTabIndex]?.label}
            </span>
            <button 
              onClick={goToNextTab}
              disabled={currentTabIndex === availableTabs.length - 1}
              className="flex items-center gap-1 disabled:opacity-30"
            >
              {currentTabIndex < availableTabs.length - 1 && availableTabs[currentTabIndex + 1].label}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tabs - Desktop */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* TabsList oculto em mobile, visível em desktop */}
          <TabsList className={cn(
            "bg-stone-100 dark:bg-stone-800",
            isMobile 
              ? "hidden" 
              : "grid w-full lg:w-auto lg:inline-flex",
            !isMobile && `grid-cols-${availableTabs.length}`
          )}>
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-stone-700"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Conteúdo das Tabs */}
          <div className="flex-1 mt-2 sm:mt-4 overflow-hidden">
            <TabsContent value="chat" className="h-full m-0">
              <ChatPanel />
            </TabsContent>
            
            <TabsContent value="insights" className="m-0 h-full overflow-auto">
              <InsightCards />
            </TabsContent>
            
            <TabsContent value="alerts" className="m-0 h-full overflow-auto">
              <AlertsTable />
            </TabsContent>
            
            <TabsContent value="actions" className="m-0 h-full overflow-auto">
              <ActionsQueue />
            </TabsContent>
            
            <TabsContent value="predictions" className="m-0 h-full overflow-auto">
              <PredictionsDashboard />
            </TabsContent>
            
            {isAdmin && (
              <TabsContent value="config" className="m-0 h-full overflow-auto">
                <CopilotSettings />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {/* Barra de navegação fixa (Mobile) */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 px-2 py-2 safe-area-inset-bottom z-50">
            <div className="flex justify-around items-center max-w-md mx-auto">
              {availableTabs.slice(0, 5).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]",
                      isActive 
                        ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" 
                        : "text-stone-500 dark:text-stone-400"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Espaçador para barra de navegação mobile */}
        {isMobile && <div className="h-20" />}
      </div>
    </DashboardLayout>
  );
}
