/* Service worker do app Agenda: notificações push + cache leve para abrir rápido e funcionar
   minimamente sem internet. */

const VERSAO = "agenda-v2";
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const CACHE_PAGINAS = `${VERSAO}-paginas`;
const PAGINA_OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) => cache.addAll([PAGINA_OFFLINE, "/manifest.webmanifest", "/icons/icon-192.png"]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => !c.startsWith(VERSAO)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Arquivos com hash do Next: cache primeiro (nunca mudam)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(CACHE_ESTATICO).then(async (cache) => {
        const emCache = await cache.match(request);
        if (emCache) return emCache;
        const resposta = await fetch(request);
        if (resposta.ok) cache.put(request, resposta.clone());
        return resposta;
      }),
    );
    return;
  }

  // Navegações: rede primeiro; se cair, última versão da página ou a tela offline
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const resposta = await fetch(request);
          if (resposta.ok) {
            const cache = await caches.open(CACHE_PAGINAS);
            cache.put(request, resposta.clone());
          }
          return resposta;
        } catch {
          const cache = await caches.open(CACHE_PAGINAS);
          return (await cache.match(request)) || (await caches.match(PAGINA_OFFLINE)) || Response.error();
        }
      })(),
    );
  }
});

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { body: event.data ? event.data.text() : "" };
  }

  const titulo = dados.title || "Agenda";
  const opcoes = {
    body: dados.body || "",
    tag: dados.tag || "agenda",
    renotify: true,
    data: { url: dados.url || "/" },
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  const destino = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const cliente of lista) {
        if ("focus" in cliente) {
          cliente.navigate(destino);
          return cliente.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
