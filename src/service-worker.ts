/// <reference lib="webworker" />
import { build, files, version } from "$service-worker";

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE = "relayline-" + version;
const ASSETS = [...build, ...files];

worker.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  worker.skipWaiting();
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith("relayline-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await worker.clients.claim();
    }),
  );
});

worker.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== worker.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match("/")) ?? Response.error();
      }
    }),
  );
});
