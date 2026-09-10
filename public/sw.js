// Bump this whenever the shell changes so old caches are dropped.
const CACHE = "budget-v2";

/**
 * Every path here is relative to the service worker's own scope, so the same
 * file works whether the app is served from the root or from a GitHub Pages
 * subfolder like /budget-app/.
 */
const SHELL = ["./", "./expenses/", "./income/", "./trends/", "./settings/"];

const scopeUrl = () => new URL("./", self.registration.scope);

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL.map((p) => new URL(p, self.registration.scope).href)))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Leave anything outside this app's subfolder alone.
  if (!url.pathname.startsWith(scopeUrl().pathname)) return;

  // Network first so a deploy is picked up immediately; cache is the offline net.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches
          .open(CACHE)
          .then((cache) => cache.put(request, copy))
          .catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match(scopeUrl().href);
          if (shell) return shell;
        }
        return new Response("Offline", { status: 503, statusText: "Offline" });
      })
  );
});
