/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<import("workbox-precaching").PrecacheEntry | string>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = event.data.json() as typeof payload;
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title || "dita";
  const body = payload.body || "Nova aprovação pendente";
  const url = payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | undefined)?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          const windowClient = client as WindowClient;
          await windowClient.navigate(target);
          return windowClient.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
