import { Buffer } from "node:buffer";
import { createServer } from "node:http";

const port = Number.parseInt(process.env.PORT ?? "3103", 10);
const sessionCookiePattern = /(?:^|;\s*)__Host-cvg_session=[^;\s]+/u;

function sendJson(response, status, data) {
  const body = JSON.stringify(data);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/ready") {
    sendJson(response, 200, { ready: true });
    return;
  }

  if (
    request.method !== "GET" ||
    (request.url !== "/api/v1/dashboard" &&
      request.url !== "/api/v1/internal/session/scopes")
  ) {
    sendJson(response, 404, { success: false, error: "not_found" });
    return;
  }

  if (!sessionCookiePattern.test(request.headers.cookie ?? "")) {
    sendJson(response, 401, { success: false, error: "unauthorized" });
    return;
  }

  const data =
    request.url === "/api/v1/dashboard"
      ? { kind: "staff", scopes: ["synthetic-e2e-scope"] }
      : {
          kind: "internal_session_scopes",
          scopes: ["synthetic-e2e-scope"],
        };
  sendJson(response, 200, {
    success: true,
    data,
    meta: { request_id: "proxy-fixture" },
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`proxy fixture listening on 127.0.0.1:${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
