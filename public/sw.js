const CACHE_NAME = "gavium-v6";
const APP_SHELL = ["/", "/faculdade", "/manifest.webmanifest", "/icons/icon-192.png", "/brand/gavium-mark.svg"];
const CACHEABLE_DESTINATIONS = new Set(["font", "image", "manifest", "script", "style"]);

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
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (event.request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) ?? caches.match("/"))
    );
    return;
  }

  if (CACHEABLE_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          return cached;
        }

        return fetch(event.request).then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            return caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .then(() => response);
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Gavium",
    body: "Voce tem um lembrete pendente."
  };
  let data = fallback;
  if (event.data) {
    const rawPayload = event.data.text();
    try {
      data = { ...fallback, ...JSON.parse(rawPayload) };
    } catch {
      data = { ...fallback, body: rawPayload || fallback.body };
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: data.body || fallback.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "gavium",
      renotify: true,
      silent: false,
      timestamp: Date.now(),
      vibrate: [180, 80, 180],
      data: data.url || "/",
      actions: [
        { action: "open", title: "Abrir" }
      ]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data || "/", self.location.origin).href;

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
