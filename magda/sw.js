// Skin Mission Zadania — service worker: offline, powiadomienia push z serwera, kliknięcia w powiadomienia
const NS = new URL(self.registration.scope).pathname;   // np. /ogarniam/ albo /magda/ — każda aplikacja ma osobną pamięć
const SHELL = 'shell:' + NS + ':v12';
const DATA = 'data:' + NS;
const FILES = ['./', './index.html', './config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/badge-96.png', './icons/icon.svg'];
const ACTIONS = [{action:'done', title:'Zrobione'}, {action:'snooze', title:'Za godzinę'}];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith('shell:' + NS + ':') && k !== SHELL) || k.startsWith('ogarniam-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Pliki aplikacji: najpierw sieć (żeby aktualizacje docierały), bez internetu z pamięci.
// Biblioteki i fonty z zewnątrz: najpierw pamięć. Zapytania do bazy (Supabase) zawsze idą do sieci.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('__reminders.json') || url.pathname.endsWith('__fired.json')) return;
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(SHELL).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy)); }
      return r;
    }).catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req, {ignoreSearch: req.mode === 'navigate'})));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
    return r;
  })));
});

// Powiadomienie wysłane z serwera (działa przy zamkniętej aplikacji)
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Przypomnienie', {
    body: d.body || '', tag: d.tag, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
    data: { id: d.id }, requireInteraction: !!d.urgent, actions: ACTIONS,
  }));
});

// Kliknięcie w powiadomienie albo w przycisk „Zrobione” / „Za godzinę”
self.addEventListener('notificationclick', e => {
  const n = e.notification; n.close();
  const id = n.data && n.data.id; const action = e.action || 'open';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    if (all.length) { const c = all[0]; c.postMessage({type:'action', action, id}); return c.focus(); }
    return self.clients.openWindow(self.registration.scope + '?a=' + action + '&id=' + encodeURIComponent(id || ''));
  })());
});

// Android bez konta: Chrome czasem budzi aplikację w tle i sprawdza zapisane przypomnienia
self.addEventListener('periodicsync', e => { if (e.tag === 'reminders') e.waitUntil(fireDue()); });

async function fireDue(){
  const c = await caches.open(DATA);
  const res = await c.match('./__reminders.json'); if (!res) return;
  const list = await res.json();
  const firedRes = await c.match('./__fired.json');
  const fired = firedRes ? await firedRes.json() : {};
  const now = Date.now(); let changed = false;
  for (const r of list) {
    if (fired[r.key] || r.at > now) continue;
    fired[r.key] = now; changed = true;
    if (now - r.at < 6 * 3600e3) {
      await self.registration.showNotification(r.title, { body: r.body, tag: r.key, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
        data: {id: r.id}, requireInteraction: !!r.urgent, actions: ACTIONS });
    }
  }
  if (changed) await c.put('./__fired.json', new Response(JSON.stringify(fired), {headers:{'content-type':'application/json'}}));
}
