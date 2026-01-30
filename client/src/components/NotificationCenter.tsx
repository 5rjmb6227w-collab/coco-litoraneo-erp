/**
 * Central de Notificações - Push Notifications para alertas críticos
 * Exibe notificações em tempo real para:
 * - Pagamentos atrasados
 * - Estoque baixo
 * - Não conformidades abertas
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, AlertTriangle, DollarSign, Package, FileWarning, Check, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export type NotificationType = 'payment' | 'stock' | 'quality' | 'production' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  read: boolean;
  link?: string;
  metadata?: Record<string, any>;
}

// Ícones por tipo de notificação
const notificationIcons: Record<NotificationType, typeof Bell> = {
  payment: DollarSign,
  stock: Package,
  quality: FileWarning,
  production: AlertTriangle,
  system: Bell,
};

// Cores por severidade
const severityColors: Record<string, string> = {
  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
};

// Labels em português
const severityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const typeLabels: Record<NotificationType, string> = {
  payment: 'Financeiro',
  stock: 'Estoque',
  quality: 'Qualidade',
  production: 'Produção',
  system: 'Sistema',
};

// Formatar tempo relativo
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  return new Date(date).toLocaleDateString('pt-BR');
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Buscar alertas do dashboard
  const { data: dashboardAlerts, refetch: refetchAlerts } = trpc.dashboard.alerts.useQuery(
    undefined,
    {
      refetchInterval: 60000, // Atualizar a cada 1 minuto
      staleTime: 30000,
    }
  );

  // Converter alertas do dashboard em notificações
  useEffect(() => {
    if (dashboardAlerts && dashboardAlerts.length > 0) {
      const newNotifications: Notification[] = dashboardAlerts.map((alert: any, index: number) => {
        // Determinar tipo baseado na categoria
        let type: NotificationType = 'system';
        if (alert.category === 'financial') type = 'payment';
        else if (alert.category === 'stock') type = 'stock';
        else if (alert.category === 'quality') type = 'quality';
        else if (alert.category === 'production') type = 'production';

        // Determinar severidade
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        if (alert.priority === 'critical' || alert.priority === 'alta') severity = 'critical';
        else if (alert.priority === 'high' || alert.priority === 'media') severity = 'high';
        else if (alert.priority === 'low' || alert.priority === 'baixa') severity = 'low';

        return {
          id: `alert-${alert.id || index}-${Date.now()}`,
          type,
          title: alert.title || 'Alerta do Sistema',
          message: alert.message || alert.description || '',
          severity,
          timestamp: alert.createdAt ? new Date(alert.createdAt) : new Date(),
          read: false,
          link: alert.link,
          metadata: alert.metadata,
        };
      });

      // Mesclar com notificações existentes, evitando duplicatas
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.title + n.message));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.title + n.message));
        
        // Manter apenas as últimas 50 notificações
        return [...uniqueNew, ...prev].slice(0, 50);
      });

      setLastFetch(new Date());
    }
  }, [dashboardAlerts]);

  // Marcar notificação como lida
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Remover notificação
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Limpar todas as notificações
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Contar não lidas
  const unreadCount = notifications.filter(n => !n.read).length;

  // Contar por severidade
  const criticalCount = notifications.filter(n => !n.read && n.severity === 'critical').length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <Bell className={cn(
            "h-5 w-5 transition-colors",
            criticalCount > 0 ? "text-red-500" : unreadCount > 0 ? "text-yellow-500" : "text-muted-foreground"
          )} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs font-bold",
                criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-yellow-500"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">Notificações</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Lista de notificações */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Nenhuma notificação</p>
              <p className="text-xs mt-1">Você está em dia!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                    }}
                  >
                    {/* Ícone */}
                    <div className={cn(
                      "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border",
                      severityColors[notification.severity]
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            !notification.read && "text-foreground",
                            notification.read && "text-muted-foreground"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", severityColors[notification.severity])}
                        >
                          {severityLabels[notification.severity]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {typeLabels[notification.type]}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {lastFetch && (
          <div className="px-4 py-2 border-t bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">
              Última atualização: {formatRelativeTime(lastFetch)}
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
