// 戦術ライブラリ Service Worker
// 方針: APIとページはネットワーク優先(常に最新)、静的アセットはキャッシュ優先。
// オフライン時はキャッシュしたトップ(index.html)を返す。更新時は VERSION を上げる。
const VERSION = "senjutsu-v1";
const SHELL = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // YouTube等の外部は素通し

  // API はネットワーク優先・保存しない(共有DBを常に最新で表示)
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // ページ遷移はネットワーク優先→オフライン時はキャッシュのトップ
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }
  // 静的アセット: キャッシュ優先、無ければ取得してキャッシュ
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match("/index.html"))
    )
  );
});
