import { isIP } from "node:net";

type AddressFamily = 4 | 6;

type ParsedAddress = Readonly<{
  readonly family: AddressFamily;
  readonly value: bigint;
}>;

export type TrustedProxyCidr = Readonly<{
  readonly family: AddressFamily;
  readonly network: bigint;
  readonly prefixLength: number;
}>;

function parseIpv4(value: string): bigint | undefined {
  const octets = value.split(".");
  if (octets.length !== 4) return undefined;
  const numbers = octets.map((octet) => Number(octet));
  if (
    numbers.some(
      (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255,
    )
  ) {
    return undefined;
  }
  return numbers.reduce((result, octet) => (result << 8n) | BigInt(octet), 0n);
}

function parseIpv6(value: string): bigint | undefined {
  const normalized = value.toLowerCase();
  const pieces = normalized.split("::");
  if (pieces.length > 2) return undefined;
  const expand = (part: string): string[] => {
    if (part.length === 0) return [];
    return part.split(":").flatMap((segment) => {
      if (!segment.includes(".")) return [segment];
      const ipv4 = parseIpv4(segment);
      if (ipv4 === undefined) return [];
      return [
        ((ipv4 >> 16n) & 0xffffn).toString(16),
        (ipv4 & 0xffffn).toString(16),
      ];
    });
  };
  const left = expand(pieces[0] ?? "");
  const right = expand(pieces[1] ?? "");
  if (
    left.length + right.length > 8 ||
    (pieces.length === 1 && left.length !== 8)
  ) {
    return undefined;
  }
  const groups = [
    ...left,
    ...Array.from({ length: 8 - left.length - right.length }, () => "0"),
    ...right,
  ];
  if (
    groups.length !== 8 ||
    groups.some((group) => !/^[0-9a-f]{1,4}$/u.test(group))
  ) {
    return undefined;
  }
  return groups.reduce(
    (result, group) => (result << 16n) | BigInt(Number.parseInt(group, 16)),
    0n,
  );
}

function parseAddress(value: string): ParsedAddress | undefined {
  const family = isIP(value);
  if (family !== 4 && family !== 6) return undefined;
  const parsed = family === 4 ? parseIpv4(value) : parseIpv6(value);
  return parsed === undefined ? undefined : { family, value: parsed };
}

function maskFor(family: AddressFamily, prefixLength: number): bigint {
  const width = family === 4 ? 32n : 128n;
  return prefixLength === 0
    ? 0n
    : ((1n << BigInt(prefixLength)) - 1n) << (width - BigInt(prefixLength));
}

function parseCidr(value: string): TrustedProxyCidr | undefined {
  const parts = value.trim().split("/");
  if (parts.length !== 2) return undefined;
  const address = parts[0] === undefined ? undefined : parseAddress(parts[0]);
  if (address === undefined || parts[1] === undefined) return undefined;
  const prefixLength = Number(parts[1]);
  const maxPrefixLength = address.family === 4 ? 32 : 128;
  if (
    !Number.isInteger(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > maxPrefixLength
  ) {
    return undefined;
  }
  const mask = maskFor(address.family, prefixLength);
  return Object.freeze({
    family: address.family,
    network: address.value & mask,
    prefixLength,
  });
}

export function parseTrustedProxyCidrs(
  values: readonly string[] = [],
): readonly TrustedProxyCidr[] {
  const parsed = values.map(parseCidr);
  if (parsed.some((value) => value === undefined)) {
    throw new RangeError("trustedProxyCidrs must contain valid CIDR ranges");
  }
  return Object.freeze(
    parsed.filter((value): value is TrustedProxyCidr => value !== undefined),
  );
}

function isTrustedProxy(
  address: ParsedAddress,
  trustedProxyCidrs: readonly TrustedProxyCidr[],
): boolean {
  return trustedProxyCidrs.some((cidr) => {
    if (cidr.family !== address.family) return false;
    return (
      (address.value & maskFor(cidr.family, cidr.prefixLength)) === cidr.network
    );
  });
}

function forwardedAddresses(
  value: string | readonly string[] | undefined,
): readonly ParsedAddress[] | undefined {
  if (value === undefined) return [];
  const raw = typeof value === "string" ? value : value.join(",");
  const values = raw.split(",").map((part) => part.trim());
  if (values.some((part) => part.length === 0)) return undefined;
  const parsed = values.map(parseAddress);
  return parsed.some((part) => part === undefined)
    ? undefined
    : parsed.filter((part): part is ParsedAddress => part !== undefined);
}

export function resolveClientAddress(
  peerAddress: string | undefined,
  forwardedFor: string | readonly string[] | undefined,
  trustedProxyCidrs: readonly TrustedProxyCidr[],
): string {
  const peer =
    peerAddress === undefined ? undefined : parseAddress(peerAddress);
  if (peer === undefined || !isTrustedProxy(peer, trustedProxyCidrs)) {
    return peerAddress ?? "unknown";
  }

  const forwarded = forwardedAddresses(forwardedFor);
  if (forwarded === undefined) return peerAddress ?? "unknown";

  for (let index = forwarded.length - 1; index >= 0; index -= 1) {
    const candidate = forwarded[index];
    if (candidate === undefined) continue;
    if (!isTrustedProxy(candidate, trustedProxyCidrs)) {
      const raw =
        typeof forwardedFor === "string"
          ? forwardedFor.split(",")[index]
          : forwardedFor?.join(",").split(",")[index];
      return raw?.trim() ?? peerAddress ?? "unknown";
    }
  }
  return peerAddress ?? "unknown";
}
