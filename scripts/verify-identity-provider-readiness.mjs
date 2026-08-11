import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const securityPath = "/v1/accounts/{principal}/security";

export function assertIdentityProviderSecurityStatus(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("identity provider security status is not ready");
  }
  const candidate = value;
  if (
    candidate.provider !== "EXTERNAL_IDENTITY_PROVIDER" ||
    candidate.recovery !== "AVAILABLE" ||
    candidate.mfa !== "ENABLED"
  ) {
    throw new Error("identity provider security status is not ready");
  }
  return Object.freeze({
    provider: candidate.provider,
    recovery: candidate.recovery,
    mfa: candidate.mfa,
  });
}

export async function probeIdentityProviderReadiness(
  environment = process.env,
  fetchImpl = globalThis.fetch,
) {
  if (environment.CVG_VERIFY_IDENTITY_PROVIDER !== "true") {
    return Object.freeze({
      status: "NOT_EXECUTED",
      reason:
        "set CVG_VERIFY_IDENTITY_PROVIDER=true in the approved environment",
    });
  }
  const baseUrl = requiredEnvironment(environment, "IDENTITY_PROVIDER_URL");
  const bearerToken = requiredEnvironment(
    environment,
    "IDENTITY_PROVIDER_TOKEN",
  );
  const principal = requiredEnvironment(
    environment,
    "CVG_IDENTITY_PROVIDER_PROBE_PRINCIPAL",
  );
  const parsedBaseUrl = parseHttpsUrl(baseUrl);
  const endpoint = `${parsedBaseUrl.origin}${securityPath.replace(
    "{principal}",
    encodeURIComponent(principal),
  )}`;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${bearerToken}`,
      },
      signal: globalThis.AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("identity provider request failed");
  }
  if (!response.ok) {
    throw new Error("identity provider request failed");
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("identity provider security status is not ready");
  }
  const status = assertIdentityProviderSecurityStatus(payload);
  return Object.freeze({
    status: "PASS",
    provider: status.provider,
    recovery: status.recovery,
    mfa: status.mfa,
    probe: "security-status",
  });
}

function requiredEnvironment(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function parseHttpsUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("IDENTITY_PROVIDER_URL must use HTTPS");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname === "" ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    throw new Error("IDENTITY_PROVIDER_URL must use HTTPS");
  }
  return parsed;
}

async function main() {
  try {
    console.log(JSON.stringify(await probeIdentityProviderReadiness()));
  } catch {
    console.error(
      JSON.stringify({
        status: "FAIL",
        code: "identity_provider_not_ready",
      }),
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  await main();
}
