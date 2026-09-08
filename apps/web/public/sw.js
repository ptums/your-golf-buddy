// Lightweight Service Worker for Your Golf Buddy
// Only caches essential resources for core offline functionality

const CACHE_NAME = "golf-buddy-lightweight-v1";
const ESSENTIAL_CACHE = "golf-buddy-essential-v1";

// Essential resources that should always be available offline
const ESSENTIAL_RESOURCES = [
  "/manifest.json",
  "/favicon-192.png",
  "/favicon-512.png",
];

// Install event - cache only essential resources
self.addEventListener("install", function (event) {
  console.log("Lightweight Service Worker installing...");

  event.waitUntil(
    caches
      .open(ESSENTIAL_CACHE)
      .then(function (cache) {
        console.log("Caching essential resources for offline use");
        // Cache essential resources one by one to handle failures gracefully
        return Promise.allSettled(
          ESSENTIAL_RESOURCES.map((resource) =>
            cache.add(resource).catch((error) => {
              console.warn(`Failed to cache ${resource}:`, error);
              return null;
            })
          )
        );
      })
      .catch((error) => {
        console.warn("Failed to open cache:", error);
      })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", function (event) {
  console.log("Lightweight Service Worker activating...");

  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== ESSENTIAL_CACHE && cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - simple caching strategy
self.addEventListener("fetch", function (event) {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API calls and dynamic content
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("?") ||
    url.pathname.includes("#")
  ) {
    return;
  }

  // For essential resources, serve from cache first
  if (ESSENTIAL_RESOURCES.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(function (response) {
        return (
          response ||
          fetch(request).catch((error) => {
            console.warn("Fetch failed for essential resource:", error);
            return response; // Return cached version if fetch fails
          })
        );
      })
    );
    return;
  }

  // For all other requests, just fetch from network
  // This prevents 404 errors from trying to cache non-existent resources
});

// Keep the existing push notification handling (lightweight)
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/favicon-192.png",
      badge: "/favicon-192.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Notification click handling
self.addEventListener("notificationclick", function (event) {
  console.log("Notification click received.");
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(function (clientList) {
      if (clientList.length > 0) {
        return clientList[0].focus();
      } else {
        return clients.openWindow("/");
      }
    })
  );
});

// Message handling for PWA installation
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
