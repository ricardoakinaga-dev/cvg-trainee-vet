import { createHash } from "node:crypto";

export function mutationIdentityKey(identity) {
  const { source, sourceDigest, mutatorName, location, replacement } = identity;
  if (
    typeof source !== "string" ||
    !source ||
    source.startsWith("/") ||
    source.split("/").includes("..") ||
    typeof sourceDigest !== "string" ||
    !/^[a-f0-9]{64}$/u.test(sourceDigest) ||
    typeof mutatorName !== "string" ||
    !mutatorName ||
    typeof replacement !== "string"
  )
    throw new Error("missing exact source/operator/replacement/digest proof");
  for (const point of [location?.start, location?.end]) {
    if (
      !Number.isSafeInteger(point?.line) ||
      point.line < 1 ||
      !Number.isSafeInteger(point?.column) ||
      point.column < 1
    ) {
      throw new Error("missing exact location proof");
    }
  }
  const { start, end } = location;
  if (
    end.line < start.line ||
    (end.line === start.line && end.column <= start.column)
  )
    throw new Error("invalid location range");
  return JSON.stringify([
    source,
    sourceDigest,
    mutatorName,
    start.line,
    start.column,
    end.line,
    end.column,
    replacement,
  ]);
}

export function validateMutationIdentities(identities, sources) {
  try {
    if (!Array.isArray(identities) || identities.length === 0)
      throw new Error("missing identities");
    const keys = new Set();
    for (const identity of identities) {
      const key = mutationIdentityKey(identity);
      if (keys.has(key)) throw new Error("duplicated identity");
      keys.add(key);
      const source = sources?.[identity.source];
      if (
        typeof source !== "string" ||
        createHash("sha256").update(source).digest("hex") !==
          identity.sourceDigest
      )
        throw new Error("missing source or stale hash");
      const lines = source.split("\n");
      for (const point of [identity.location.start, identity.location.end]) {
        if (
          point.line > lines.length ||
          point.column > lines[point.line - 1].length + 1
        )
          throw new Error("location outside source");
      }
    }
    return { valid: true, keys: [...keys] };
  } catch (error) {
    return { valid: false, outcome: "NOT_VERIFIED", detail: error.message };
  }
}
