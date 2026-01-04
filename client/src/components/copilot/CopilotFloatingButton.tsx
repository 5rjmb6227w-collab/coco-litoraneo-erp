/**
 * CopilotFloatingButton - Botão flutuante para acesso rápido ao Copiloto IA
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Bot, X, MessageCircle, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopilotFloatingButton() {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Buscar contadores de insights e alertas
  const insightsQuery = trpc.ai.listInsights.useQuery({ status: "active", limit: 100 });
  const eventsQuery = trpc.ai.listEvents.useQuery({ limit: 10 });
  
  const activeInsights = insightsQuery.data?.length || 0;
  const criticalInsights = insightsQuery.data?.filter((i: any) => i.severity === "critical").length || 0;
  const recentEvents = eventsQuery.data?.length || 0;
  
  const totalNotifications = activeInsights + (criticalInsights > 0 ? 1 : 0);

  // Não mostrar na página do copiloto
  useEffect(() => {
    setIsVisible(!location.startsWith("/copiloto"));
  }, [location]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Menu expandido */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-lg border p-3 mb-2 animate-in slide-in-from-bottom-2 duration-200">
          <div className="space-y-2 min-w-[200px]">
            <Link href="/copiloto">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 h-9"
                onClick={() => setIsExpanded(false)}
              >
                <MessageCircle className="h-4 w-4 text-amber-600" />
                <span>Chat com IA</span>
              </Button>
            </Link>
            
            <Link href="/copiloto?tab=insights">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 h-9"
                onClick={() => setIsExpanded(false)}
              >
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span>Insights</span>
                {activeInsights > 0 && (
                  <Badge className="ml-auto bg-amber-100 text-amber-700 text-xs">
                    {activeInsights}
                  </Badge>
                )}
              </Button>
            </Link>
            
            <Link href="/copiloto?tab=alertas">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 h-9"
                onClick={() => setIsExpanded(false)}
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Alertas</span>
                {criticalInsights > 0 && (
                  <Badge className="ml-auto bg-red-100 text-red-700 text-xs">
                    {criticalInsights}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Botão principal */}
      <div className="relative">
        <Button
          size="lg"
          className={cn(
            "rounded-full h-14 w-14 shadow-lg transition-all duration-200",
            isExpanded 
              ? "bg-stone-600 hover:bg-stone-700" 
              : "bg-amber-600 hover:bg-amber-700",
            criticalInsights > 0 && !isExpanded && "animate-pulse"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <Bot className="h-6 w-6" />
          )}
        </Button>
        
        {/* Badge de notificações */}
        {!isExpanded && totalNotifications > 0 && (
          <Badge 
            className={cn(
              "absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs",
              criticalInsights > 0 
                ? "bg-red-500 text-white" 
                : "bg-amber-500 text-white"
            )}
          >
            {totalNotifications > 9 ? "9+" : totalNotifications}
          </Badge>
        )}
      </div>
    </div>
  );
}
