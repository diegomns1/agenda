/* Service worker do app Agenda: notificações push (módulo 6).
   O cache offline do shell entra no módulo 8 (PWA). */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
