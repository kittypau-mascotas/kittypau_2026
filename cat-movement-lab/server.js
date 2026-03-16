// Minimal static server (no deps) for local lab usage.
// Run: node server.js

const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_PORT = process.env.PORT ? Number(process.env.PORT) : 8844;
const ROOT = __dirname;
const MOTION_JSON_PATH = path.resolve(
  __dirname,
  "..",
  "kittypau_app",
  "src",
  "app",
  "_data",
  "cat-copy.motion.json",
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0] || "/");
  const cleaned = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(root, cleaned);
  if (!resolved.startsWith(path.resolve(root))) return null;
  return resolved;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer((req, res) => {
  const url = String(req.url || "/");
  const pathname = url.split("?")[0] || "/";
  const query = (() => {
    try {
      const u = new URL(url, "http://127.0.0.1");
      return u.searchParams;
    } catch {
      return new URLSearchParams();
    }
  })();

  // Local API to sync with Kittypau copy-cat motion config.
  if (pathname === "/api/motion") {
    if (req.method === "GET") {
      try {
        const raw = fs.readFileSync(MOTION_JSON_PATH, "utf8");
        res.writeHead(200, { "Content-Type": MIME[".json"] });
        res.end(raw);
      } catch (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Motion file not found");
      }
      return;
    }

    if (req.method === "POST") {
      readBody(req)
        .then((body) => {
          let parsed;
          try {
            parsed = JSON.parse(body || "{}");
          } catch {
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Invalid JSON");
            return;
          }

          if (!parsed || typeof parsed !== "object") {
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Invalid payload");
            return;
          }

          // Dry-run: validate JSON but do not write to disk.
          if (query.get("dry") === "1") {
            res.writeHead(200, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: true, dry: true }, null, 2));
            return;
          }

          try {
            fs.mkdirSync(path.dirname(MOTION_JSON_PATH), { recursive: true });
            fs.writeFileSync(
              MOTION_JSON_PATH,
              `${JSON.stringify(parsed, null, 2)}\n`,
              "utf8",
            );
            res.writeHead(200, { "Content-Type": MIME[".json"] });
            res.end(JSON.stringify({ ok: true }, null, 2));
          } catch {
            res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Failed to write motion file");
          }
        })
        .catch(() => {
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Bad request");
        });
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method not allowed");
    return;
  }

  if (pathname === "/api/motion-path") {
    res.writeHead(200, { "Content-Type": MIME[".json"] });
    res.end(JSON.stringify({ path: MOTION_JSON_PATH }, null, 2));
    return;
  }

  const filePath = safeJoin(ROOT, req.url || "/");
  if (!filePath) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  const finalPath = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
    ? path.join(filePath, "index.html")
    : filePath;

  fs.readFile(finalPath, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(finalPath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  });
});

function listenWithFallback(port, triesLeft) {
  server.once("error", (err) => {
    if (err && err.code === "EADDRINUSE" && triesLeft > 0) {
      listenWithFallback(port + 1, triesLeft - 1);
      return;
    }
    throw err;
  });

  server.listen(port, "127.0.0.1", () => {
    // eslint-disable-next-line no-console
    console.log(`Cat Movement Lab running at http://localhost:${port}`);
  });
}

listenWithFallback(BASE_PORT, 8);
