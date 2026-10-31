// KAOWIN service worker — ทำให้ติดตั้งเป็นแอปได้ และเปิดได้แม้ไม่มีเน็ต
// อัปเดตแอปแล้วอยากล้างแคชเก่า: เปลี่ยนเลขเวอร์ชันด้านล่าง
const CACHE = "kaowin-v29";
const SHELL = ["./", "index.html", "manifest.json", "icon.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // หน้าแอป: ใช้เวอร์ชันล่าสุดจากเน็ตก่อน ถ้าออฟไลน์ใช้ตัวที่เก็บไว้
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return res; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  // ไอคอน ฟอนต์ ฯลฯ: ใช้ตัวที่เก็บไว้ก่อน แล้วอัปเดตเบื้องหลัง
  const cacheable = url.origin === self.location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
        .catch(() => hit);
      return hit || net;
    })
  );
});
