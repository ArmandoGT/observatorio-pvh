import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
const root = resolve("out"),
  port = Number(process.env.PORT ?? 3000);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
};
await stat(resolve(root, "index.html"));
createServer(async (req, res) => {
  try {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let target = resolve(root, `.${pathname}`),
      rel = relative(root, target);
    if (
      rel.startsWith("..") ||
      rel.includes(":") ||
      rel.split(/[\\/]/).some((s) => s.startsWith("."))
    ) {
      res.writeHead(403);
      res.end();
      return;
    }
    let code = 200;
    try {
      const s = await stat(target);
      if (s.isDirectory()) target = resolve(target, "index.html");
      await stat(target);
    } catch {
      target = resolve(root, "404.html");
      code = 404;
    }
    const body = await readFile(target);
    res.writeHead(code, {
      "Content-Type": types[extname(target)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(400);
    res.end("Requisição inválida.");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Local: http://127.0.0.1:${port}`),
);
