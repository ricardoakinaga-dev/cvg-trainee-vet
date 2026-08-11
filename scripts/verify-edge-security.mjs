import { readFile } from "node:fs/promises";

const caddyfile = await readFile("infra/production/Caddyfile", "utf8");
const requiredCaddyDirectives = [
  'X-Content-Type-Options "nosniff"',
  'X-Frame-Options "DENY"',
  'Referrer-Policy "no-referrer"',
  'Permissions-Policy "camera=(), microphone=(), geolocation=()"',
  "Content-Security-Policy \"default-src 'none'; frame-ancestors 'none'; base-uri 'none'\"",
  "tls internal",
  "Strict-Transport-Security",
];
const missing = requiredCaddyDirectives.filter(
  (directive) => !caddyfile.includes(directive),
);
if (missing.length > 0) {
  throw new Error(`edge security directives missing: ${missing.join(", ")}`);
}

const targets = [
  process.env.CVG_EDGE_HTTP_TARGET,
  process.env.CVG_EDGE_HTTPS_TARGET,
].filter((target) => target !== undefined && target.length > 0);
const results = [];
for (const target of targets) {
  const response = await fetch(target, {
    signal: globalThis.AbortSignal.timeout(5_000),
    ...(target.startsWith("https://")
      ? { headers: { host: "localhost" } }
      : {}),
  });
  for (const header of [
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
    "content-security-policy",
  ]) {
    if (response.headers.get(header) === null) {
      throw new Error(`${target} missing ${header}`);
    }
  }
  if (
    target.startsWith("https://") &&
    response.headers.get("strict-transport-security") === null
  ) {
    throw new Error(`${target} missing strict-transport-security`);
  }
  results.push({ target, status: response.status });
}

const redirectTarget = process.env.CVG_EDGE_HTTP_REDIRECT_TARGET;
if (redirectTarget !== undefined && redirectTarget.length > 0) {
  const response = await fetch(redirectTarget, {
    redirect: "manual",
    signal: globalThis.AbortSignal.timeout(5_000),
  });
  if (response.status !== 308) {
    throw new Error(
      `${redirectTarget} must return HTTP 308, received ${response.status}`,
    );
  }
  const location = response.headers.get("location");
  if (location === null || !location.startsWith("https://")) {
    throw new Error(`${redirectTarget} must redirect to HTTPS`);
  }
}

console.log(
  JSON.stringify({
    status: "PASS",
    staticCaddyDirectives: requiredCaddyDirectives.length,
    liveTargets: results,
    httpRedirect: redirectTarget ?? null,
    tlsMode: "staging-internal-or-approved-managed-certificate",
  }),
);
