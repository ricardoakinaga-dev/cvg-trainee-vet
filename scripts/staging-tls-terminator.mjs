import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:https";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/* global URL */

const port = Number(process.argv[2] ?? "3443");
const target = process.argv[3] ?? "http://127.0.0.1:3101";
const certPath =
  process.env.CVG_STAGING_TLS_CERT ?? "/tmp/cvg-staging-cert.pem";
const keyPath = process.env.CVG_STAGING_TLS_KEY ?? "/tmp/cvg-staging-key.pem";

async function ensureCertificate() {
  try {
    await Promise.all([readFile(certPath), readFile(keyPath)]);
    return;
  } catch {
    // fall through to generation
  }
  await execFileAsync("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-days",
    "2",
    "-nodes",
    "-subj",
    "/CN=127.0.0.1",
  ]);
}

await ensureCertificate();
const [cert, key] = await Promise.all([readFile(certPath), readFile(keyPath)]);

const server = createServer({ cert, key }, (request, response) => {
  const targetUrl = new URL(request.url ?? "/", target);
  import("node:http").then(({ request: httpRequest }) => {
    const upstream = httpRequest(
      {
        host: targetUrl.hostname,
        port: targetUrl.port,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: request.method,
        headers: { ...request.headers, host: targetUrl.host },
      },
      (upstreamResponse) => {
        response.writeHead(
          upstreamResponse.statusCode ?? 502,
          upstreamResponse.headers,
        );
        upstreamResponse.pipe(response);
      },
    );
    upstream.on("error", () => {
      response.statusCode = 502;
      response.end();
    });
    request.pipe(upstream);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`staging TLS terminator on 127.0.0.1:${port} -> ${target}`);
});
