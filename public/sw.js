const CACHE_NAME = "gavium-v2";
const APP_SHELL = ["/", "/faculdade", "/manifest.webmanifest", "/icons/icon.svg", "/brand/gavium-mark.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Gavium",
    body: "Voce tem um lembrete pendente."
  };
  const data = event.data ? event.data.json() : fallback;

  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: data.body || fallback.body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: data.url || "/",
      actions: [
        { action: "open", title: "Abrir" },
        { action: "snooze-10", title: "Adiar 10 min" }
      ]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const visibleClient = clients.find((client) => client.url.includes(self.location.origin));
      if (visibleClient) {
        visibleClient.focus();
        visibleClient.navigate(targetUrl);
        return;
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
