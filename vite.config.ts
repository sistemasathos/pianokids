import { defineConfig, type Plugin } from "vite";
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function collectFiles(dir: string, rel = "."): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const next = rel === "." ? `./${name}` : `${rel}/${name}`;
    if (statSync(abs).isDirectory()) out.push(...collectFiles(abs, next));
    else out.push(next);
  }
  return out;
}

function generateSw(assets: string[]): string {
  return `/* PianoKids service worker */
const CACHE = "pianokids-v3";
const ASSETS = ${JSON.stringify(assets, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type !== "opaque") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
`;
}

function pwaPrecache(): Plugin {
  return {
    name: "pianokids-sw",
    closeBundle() {
      const dist = join(process.cwd(), "dist");
      const files = collectFiles(dist).filter((f) => !f.endsWith("/sw.js") && f !== "./sw.js");
      const assets = ["./", ...files];
      writeFileSync(join(dist, "sw.js"), generateSw(assets));
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [pwaPrecache()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
