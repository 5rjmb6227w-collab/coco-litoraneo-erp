/**
 * Hook para gerenciar notificações push e sync offline
 */

import { useState, useEffect, useCallback } from 'react';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: () => void;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Verificar suporte
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window &&
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Verificar se já está inscrito
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    };
    
    checkSupport();
  }, []);

  // Inscrever para notificações push
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    setIsLoading(true);
    
    try {
      // Solicitar permissão
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        console.log('[Push] Permission denied');
        return false;
      }
      
      // Obter service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // VAPID public key - em produção, obter do servidor
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        ),
      });
      
      // Enviar subscription para o servidor
      await saveSubscription(subscription);
      
      setIsSubscribed(true);
      console.log('[Push] Subscribed successfully');
      return true;
    } catch (error) {
      console.error('[Push] Subscription failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    setIsLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await removeSubscription(subscription);
      }
      
      setIsSubscribed(false);
      console.log('[Push] Unsubscribed successfully');
      return true;
    } catch (error) {
      console.error('[Push] Unsubscription failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Enviar notificação de teste
  const sendTestNotification = useCallback(() => {
    if (permission === 'granted') {
      new Notification('Coco Litorâneo', {
        body: 'Notificações push estão funcionando! 🥥',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test',
        // vibrate: [200, 100, 200], // Não suportado em todos os navegadores
      });
    }
  }, [permission]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

// Helpers

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

async function saveSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  try {
    await fetch('/api/trpc/ai.savePushSubscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });
  } catch (error) {
    console.error('[Push] Failed to save subscription:', error);
  }
}

async function removeSubscription(subscription: globalThis.PushSubscription): Promise<void> {
  try {
    await fetch('/api/trpc/ai.removePushSubscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch (error) {
    console.error('[Push] Failed to remove subscription:', error);
  }
}

/**
 * Hook para gerenciar sync offline
 */
export function useOfflineSync() {
  const [pendingActions, setPendingActions] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Carregar ações pendentes do IndexedDB
  useEffect(() => {
    const loadPendingActions = async () => {
      const count = await getPendingActionsCount();
      setPendingActions(count);
    };
    
    loadPendingActions();
    
    // Atualizar quando voltar online
    const handleOnline = () => {
      syncPendingActions();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Sincronizar ações pendentes
  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine) return;
    
    setIsSyncing(true);
    
    try {
      // Registrar sync no service worker
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-actions');
      }
      
      // Atualizar contagem
      const count = await getPendingActionsCount();
      setPendingActions(count);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('[Sync] Failed to sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Adicionar ação para sync posterior
  const queueAction = useCallback(async (action: unknown) => {
    await savePendingAction(action);
    const count = await getPendingActionsCount();
    setPendingActions(count);
    
    // Tentar sync imediato se online
    if (navigator.onLine) {
      syncPendingActions();
    }
  }, [syncPendingActions]);

  return {
    pendingActions,
    isSyncing,
    lastSyncTime,
    syncPendingActions,
    queueAction,
  };
}

// IndexedDB helpers para sync offline
const DB_NAME = 'coco-litoraneo-offline';
const STORE_NAME = 'pending-actions';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getPendingActionsCount(): Promise<number> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch {
    return 0;
  }
}

async function savePendingAction(action: unknown): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add({
        action,
        timestamp: Date.now(),
      });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to save action:', error);
  }
}
