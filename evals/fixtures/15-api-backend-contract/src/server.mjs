import http from "node:http";

export function createApiHandler() {
  return async (req, res) => {
    if (req.method === "POST" && req.url === "/api/subscribers") {
      let body = "";
      for await (const chunk of req) body += chunk.toString("utf8");
      const parsed = JSON.parse(body || "{}");
      // Missing email validation: accepts invalid email with 200
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, email: parsed.email ?? "" }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  };
}

export function startServer(port = 0) {
  const server = http.createServer(createApiHandler());
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
