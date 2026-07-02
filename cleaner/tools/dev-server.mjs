#!/usr/bin/env node
/* dev-server.mjs — the full-stack dev front door: serves web/ statically and
   proxies the birama-engine API (/api, /auth, /healthz, /readyz) to BIRAMA_URL,
   so the session cookie is same-origin (birama ships no CORS layer — by design;
   the deployed static build never calls it cross-origin either).

   Run:  BIRAMA_URL=http://127.0.0.1:8098 node tools/dev-server.mjs [port]      */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, normalize, extname } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = join(fileURLToPath(new URL(".", import.meta.url)), "..", "web");
const PORT = Number(process.argv[2] || 8932);
const BIRAMA = process.env.BIRAMA_URL || "http://127.0.0.1:8098";
const PROXY = ["/api/", "/auth/", "/healthz", "/readyz"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".csv": "text/csv",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".map": "application/json",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── proxy the API surface (cookies pass through untouched) ──
  if (PROXY.some((p) => url.pathname === p.replace(/\/$/, "") || url.pathname.startsWith(p))) {
    try {
      const body = ["GET", "HEAD"].includes(req.method) ? undefined : await bytes(req);
      const upstream = await fetch(BIRAMA + url.pathname + url.search, {
        method: req.method,
        headers: passHeaders(req.headers),
        body,
        redirect: "manual",
      });
      const headers = {};
      upstream.headers.forEach((v, k) => {
        if (k === "transfer-encoding" || k === "content-encoding" || k === "content-length") return;
        if (k === "set-cookie") return; // handled below (multi-value)
        headers[k] = v;
      });
      const cookies = upstream.headers.getSetCookie?.() ?? [];
      if (cookies.length) headers["set-cookie"] = cookies;
      res.writeHead(upstream.status, headers);
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (e) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "bad_gateway", message: String(e?.message || e) }));
    }
    return;
  }

  // ── static web/ ──
  let path = normalize(url.pathname).replace(/^([/\\])+/, "");
  if (path === "" || path === ".") path = "index.html";
  const file = join(WEB, path);
  if (!file.startsWith(WEB)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
});

function passHeaders(h) {
  const out = {};
  for (const k of ["content-type", "cookie", "if-match", "accept"]) {
    if (h[k]) out[k] = h[k];
  }
  return out;
}
function bytes(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

server.listen(PORT, () =>
  console.log(`cleaner dev-server: http://localhost:${PORT}  (api → ${BIRAMA})`),
);
