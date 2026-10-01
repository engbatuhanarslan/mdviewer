const { createServer } = require("node:http");
const { mkdir, readFile, readdir, stat, writeFile } = require("node:fs/promises");
const { dirname, extname, join, normalize, resolve } = require("node:path");
const { spawn } = require("node:child_process");

const root = __dirname;
const appDataRoot = process.pkg ? dirname(process.execPath) : root;
const documentsDir = join(appDataRoot, "documents", "markdown_viewer");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const mimeTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".png": "image/png" };

function openBrowser(url) {
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
}
function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}
function safeName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || name !== normalize(name) || name.includes("/") || name.includes("\\")) return null;
  return /\.md$/i.test(name) ? name : `${name}.md`;
}
async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 5_000_000) throw new Error("Dosya çok büyük");
  }
  return JSON.parse(body || "{}");
}
async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/documents") {
    const entries = await readdir(documentsDir, { withFileTypes: true });
    const files = await Promise.all(entries.filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".md")).map(async entry => {
      const info = await stat(join(documentsDir, entry.name));
      return { name: entry.name, size: info.size, updatedAt: info.mtime.toISOString() };
    }));
    files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return sendJson(res, 200, files);
  }
  if (url.pathname.startsWith("/api/documents/")) {
    const name = safeName(decodeURIComponent(url.pathname.slice(15)));
    if (!name) return sendJson(res, 400, { error: "Geçersiz dosya adı" });
    const target = join(documentsDir, name);
    if (req.method === "GET") {
      try { return sendJson(res, 200, { name, content: await readFile(target, "utf8") }); }
      catch (error) { if (error.code === "ENOENT") return sendJson(res, 404, { error: "Dosya bulunamadı" }); throw error; }
    }
    if (req.method === "PUT") {
      const data = await readBody(req);
      if (typeof data.content !== "string") return sendJson(res, 400, { error: "İçerik metin olmalı" });
      await writeFile(target, data.content, "utf8");
      return sendJson(res, 200, { name, saved: true });
    }
  }
  return sendJson(res, 404, { error: "Bulunamadı" });
}
async function serveFile(res, pathname) {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const target = resolve(root, relative);
  if (target !== join(root, "index.html") && !target.startsWith(`${resolve(root)}/`)) return sendJson(res, 403, { error: "Erişim reddedildi" });
  try {
    const content = await readFile(target);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(target)] || "application/octet-stream" });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") return sendJson(res, 404, { error: "Bulunamadı" });
    throw error;
  }
}

(async () => {
  await mkdir(documentsDir, { recursive: true });
  createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) await handleApi(req, res, url); else await serveFile(res, url.pathname);
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: error.message || "Sunucu hatası" });
    }
  }).listen(port, host, () => {
    const url = `http://${host}:${port}`;
    console.log(`Local MD: ${url}`);
    console.log(`Kayıt klasörü: ${documentsDir}`);
    if (process.env.OPEN_BROWSER !== "0") openBrowser(url);
  });
})();
