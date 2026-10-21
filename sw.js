/* Fiscalização do Rancho – service worker: guarda o app no aparelho para abrir sem sinal.
   Ao publicar uma atualização, aumente o número da VERSAO. */
const VERSAO = "rancho-rev2";
const BASICO = [
  "./", "index.html", "config.js", "manifest.webmanifest",
  "icone-192.png", "icone-512.png", "icone-maskable-512.png", "apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => Promise.all(BASICO.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                       // envios ao servidor nunca passam pelo cache
  const url = new URL(req.url);
  if (/(^|\.)google\.com$|googleusercontent\.com$/.test(url.hostname)) return;
  const local = url.origin === self.location.origin;
  const paginaOuConfig = req.mode === "navigate" || (local && /\/(index\.html|config\.js)?$/.test(url.pathname));

  if (paginaOuConfig) {                                   // rede primeiro: pega atualizações; sem sinal, usa a cópia
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  if (local || /cdnjs\.cloudflare\.com$|fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {         // cópia primeiro, atualiza em segundo plano
      const rede = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
      return hit || rede;
    }));
  }
});
