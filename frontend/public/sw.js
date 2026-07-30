var CACHE = "sampada-v1";

var SHELL = [
  "/",
  "/offline.html",
  "/logo-offline.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match(event.request).then(function (m) {
        return m || caches.match("/offline.html");
      });
    })
  );
});
