const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const IPV6_GROUP = /^[0-9a-fA-F]{1,4}$/;

function isValidIpv6(value: string): boolean {
  if (value.length === 0 || value.length > 45) return false;
  const compression = value.split("::");
  if (compression.length > 2) return false;
  if (compression.length === 2) {
    const [head = "", tail = ""] = compression;
    const headGroups = head === "" ? [] : head.split(":");
    const tailGroups = tail === "" ? [] : tail.split(":");
    if (headGroups.length + tailGroups.length >= 8) return false;
    return [...headGroups, ...tailGroups].every((group) =>
      IPV6_GROUP.test(group),
    );
  }
  const groups = value.split(":");
  return groups.length === 8 && groups.every((group) => IPV6_GROUP.test(group));
}

function stripPort(value: string): string {
  const bracketed = /^\[([0-9a-fA-F:.]+)\](?::\d{1,5})?$/.exec(value);
  if (bracketed?.[1] !== undefined) return bracketed[1];
  const hostPort = /^([^:]+):\d{1,5}$/.exec(value);
  if (hostPort?.[1] !== undefined && !hostPort[1].includes(":")) {
    return hostPort[1];
  }
  return value;
}

export function normalizeIpAddress(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 64) return null;
  if (normalized === "::1") return "127.0.0.1";
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(normalized);
  if (mapped?.[1] !== undefined) {
    return IPV4_PATTERN.test(mapped[1]) ? mapped[1] : null;
  }
  if (IPV4_PATTERN.test(normalized)) return normalized;
  if (isValidIpv6(normalized)) return normalized.toLowerCase();
  const withoutPort = stripPort(normalized);
  if (withoutPort !== normalized) {
    if (IPV4_PATTERN.test(withoutPort)) return withoutPort;
    if (isValidIpv6(withoutPort)) return withoutPort.toLowerCase();
  }
  return null;
}

export type ForwardedHeaders = Readonly<{
  readonly "x-forwarded-for"?: string;
  readonly "x-real-ip"?: string;
  readonly forwarded?: string;
}>;

function forwardedForAddress(value: string): string | null {
  const firstSegment = value.split(";")[0] ?? "";
  const match = /for=("([^"]+)"|([^;,]+))/i.exec(firstSegment);
  const raw = (match?.[2] ?? match?.[3] ?? "").trim();
  if (raw.length === 0 || raw.toLowerCase() === "unknown") return null;
  return normalizeIpAddress(raw);
}

export function resolveClientIp(
  socketIp: string,
  headers: ForwardedHeaders = {},
  trustedProxies: readonly string[] = [],
): string {
  const socket = normalizeIpAddress(socketIp) ?? "unknown";
  if (socket === "unknown") return "unknown";
  const trusted = trustedProxies.some(
    (proxy) => normalizeIpAddress(proxy) === socket,
  );
  if (!trusted) return socket;

  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor !== undefined) {
    const first = forwardedFor.split(",")[0]?.trim() ?? "";
    const candidate = first === "" ? null : normalizeIpAddress(first);
    if (candidate !== null) return candidate;
  }
  const realIp = headers["x-real-ip"];
  if (realIp !== undefined) {
    const candidate = normalizeIpAddress(realIp);
    if (candidate !== null) return candidate;
  }
  const forwarded = headers.forwarded;
  if (forwarded !== undefined) {
    const candidate = forwardedForAddress(forwarded);
    if (candidate !== null) return candidate;
  }
  return socket;
}
