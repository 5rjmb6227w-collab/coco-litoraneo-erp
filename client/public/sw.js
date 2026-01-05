/**
 * Service Worker - Coco Litorâneo ERP
 * Cache offline, sync automático e notificações push
 */

const CACHE_NAME = 'coco-litoraneo-v1';
const OFFLINE_CACHE_NAME = 'coco-litoraneo-offline-v1';
const DATA_CACHE_NAME = 'coco-litoraneo-data-v1';

// Arquivos estáticos para cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// URLs de API para cache de dados
const API_CACHE_URLS = [
  '/api/trpc/ai.listInsights',
  '/api/trpc/ai.listAlerts',
  '/api/trpc/ai.getStats',
  '/api/trpc/ai.getQuickSummary',
  '/api/trpc/dashboard.getStats',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache de assets estáticos
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Criar cache de dados vazio
      caches.open(DATA_CACHE_NAME),
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('coco-litoraneo-') && 
                     name !== CACHE_NAME && 
                     name !== DATA_CACHE_NAME &&
                     name !== OFFLINE_CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Tomar controle imediato
      self.clients.claim(),
    ]).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Estratégia para API tRPC
  if (url.pathname.startsWith('/api/trpc/')) {
    event.respondWith(networkFirstWithCache(request, DATA_CACHE_NAME));
    return;
  }

  // Estratégia para assets estáticos
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(request, CACHE_NAME));
    return;
  }

  // Estratégia padrão: Network first com fallback para cache
  event.respondWith(networkFirstWithCache(request, CACHE_NAME));
});

// Verificar se é asset estático
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Estratégia: Cache first, network fallback
async function cacheFirstWithNetwork(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Atualizar cache em background
      fetchAndCache(request, cacheName);
      return cachedResponse;
    }
    return await fetchAndCache(request, cacheName);
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return await caches.match('/offline.html');
  }
}

// Estratégia: Network first, cache fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    // Cachear resposta bem-sucedida
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retornar página offline para navegação
    if (request.mode === 'navigate') {
      return await caches.match('/offline.html');
    }
    
    // Retornar erro para API
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Você está offline. Os dados serão sincronizados quando a conexão for restaurada.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Buscar e cachear
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  
  return response;
}

// Background Sync para ações offline
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-insights') {
    event.waitUntil(syncInsights());
  }
  
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncPendingActions());
  }
  
  if (event.tag === 'sync-alerts') {
    event.waitUntil(syncAlerts());
  }
});

// Sincronizar insights
async function syncInsights() {
  try {
    const response = await fetch('/api/trpc/ai.listInsights?input={}');
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE_NAME);
      await cache.put('/api/trpc/ai.listInsights', response.clone());
      console.log('[SW] Insights synced successfully');
    }
  } catch (error) {
    console.error('[SW] Failed to sync insights:', error);
  }
}

// Sincronizar ações pendentes
async function syncPendingActions() {
  try {
    // Buscar ações pendentes do IndexedDB
    const pendingActions = await getPendingActionsFromDB();
    
    for (const action of pendingActions) {
      try {
        const response = await fetch('/api/trpc/ai.approveAction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        });
        
        if (response.ok) {
          await removePendingActionFromDB(action.id);
          console.log('[SW] Action synced:', action.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync action:', action.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync pending actions:', error);
  }
}

// Sincronizar alertas
async function syncAlerts() {
  try {
    const response = await fetch('/api/trpc/ai.listAlerts?input={}');
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE_NAME);
      await cache.put('/api/trpc/ai.listAlerts', response.clone());
      console.log('[SW] Alerts synced successfully');
    }
  } catch (error) {
    console.error('[SW] Failed to sync alerts:', error);
  }
}

// IndexedDB helpers (simplificado)
async function getPendingActionsFromDB() {
  // Implementação simplificada - em produção usar IndexedDB real
  return [];
}

async function removePendingActionFromDB(id) {
  // Implementação simplificada
  console.log('[SW] Removing pending action:', id);
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'Coco Litorâneo',
    body: 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    data: {},
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    actions: data.actions || [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
    requireInteraction: data.requireInteraction || false,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/copiloto';
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Tentar focar janela existente
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.navigate(urlToOpen);
              return client.focus();
            }
          }
          // Abrir nova janela
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
