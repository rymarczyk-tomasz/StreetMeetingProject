// Keeps the app shell available offline, mainly so gate staff can reopen /wjazd
// with no signal. The API and uploads are never cached here — offline data for
// the gate lives in localStorage (src/utils/gateOffline.ts).
//
// - pages: network first, falling back to the last saved index.html
// - /assets/* (hashed file names, never change): cache first
// - /css/*, icons, manifest: network first, cached copy offline

const CACHE = "streetshow-shell-v2";
const MAX_ASSETS = 60;

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/")));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

// Old hashed bundles pile up after each deploy; drop the oldest ones.
async function trimAssets(cache) {
    const keys = (await cache.keys()).filter((request) => new URL(request.url).pathname.startsWith("/assets/"));
    for (const request of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) {
        await cache.delete(request);
    }
}

// With weak signal a request can hang instead of failing; after `timeoutMs`
// the cached copy is served (the network response still refreshes the cache).
async function networkFirst(request, cacheKey, timeoutMs = 0) {
    const cache = await caches.open(CACHE);
    const network = fetch(request).then(async (response) => {
        if (response.ok) await cache.put(cacheKey, response.clone());
        return response;
    });
    // Handled below or ignored when the cached copy was served.
    network.catch(() => {});

    try {
        if (!timeoutMs) return await network;
        const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs, null));
        const response = await Promise.race([network, timeout]);
        if (response) return response;
        return (await cache.match(cacheKey)) || (await network);
    } catch (error) {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        throw error;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
        await cache.put(request, response.clone());
        await trimAssets(cache);
    }
    return response;
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;

    if (request.mode === "navigate") {
        // Every route of the SPA is the same index.html.
        event.respondWith(networkFirst(request, "/", 5000));
    } else if (url.pathname.startsWith("/assets/")) {
        event.respondWith(cacheFirst(request));
    } else if (
        url.pathname.startsWith("/css/") ||
        url.pathname.startsWith("/img/favicon_io/") ||
        url.pathname === "/manifest.webmanifest"
    ) {
        // Keyed without ?v=… so each deploy replaces the copy instead of adding one.
        event.respondWith(networkFirst(request, url.pathname));
    }
});
