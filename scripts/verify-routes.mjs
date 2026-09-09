import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const registryPath = join(root, "apps/api/src/routing/route-registry.ts");
const httpPath = join(root, "apps/api/src/http.ts");

function parseRegistryEntries(source) {
  const entries = [];
  const pattern =
    /(exact|pattern)\(\s*(?:"([A-Z*]+)"|(\*))\s*,\s*"((?:[^"\\]|\\.)*)"\s*(?:,\s*"((?:[^"\\]|\\.)*)"\s*)?/gu;
  for (const match of source.matchAll(pattern)) {
    const [, kind, quotedMethod, starMethod, template, regex] = match;
    entries.push({
      method: starMethod === "*" ? "*" : quotedMethod,
      template,
      // Registry patterns are TypeScript string literals: unescape to the
      // runtime regex source before compiling.
      regex:
        kind === "pattern" && regex !== undefined
          ? regex.replace(/\\\\/gu, "\\").replace(/\\"/gu, '"')
          : null,
    });
  }
  return entries;
}

function scanRegexLiteral(source, fromIndex) {
  let index = fromIndex;
  while (index < source.length && /\s/u.test(source[index])) index += 1;
  if (source[index] !== "/") return null;
  index += 1;
  let body = "";
  let inClass = false;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      body += character + (source[index + 1] ?? "");
      index += 2;
      continue;
    }
    if (character === "[") inClass = true;
    if (character === "]") inClass = false;
    if (character === "/" && !inClass) break;
    body += character;
    index += 1;
  }
  index += 1;
  let flags = "";
  while (index < source.length && /[a-z]/u.test(source[index])) {
    flags += source[index];
    index += 1;
  }
  return { source: body, flags, end: index };
}

function parseDispatchRoutes(source) {
  const routes = [];
  for (const match of source.matchAll(/request\.path === "([^"]+)"/gu)) {
    const before = source.slice(Math.max(0, match.index - 400), match.index);
    const method = [
      ...before.matchAll(/request\.method === "([A-Z]+)"/gu),
    ].pop();
    routes.push({
      kind: "exact",
      method: method?.[1] ?? "*",
      path: match[1],
    });
  }
  for (const match of source.matchAll(/request\.path\.match\(/gu)) {
    const scanned = scanRegexLiteral(source, match.index + match[0].length);
    if (scanned === null) continue;
    routes.push({
      kind: "regex",
      method: nearestMethod(source, match.index, scanned.end),
      regex: new RegExp(scanned.source, scanned.flags),
      regexSource: scanned.source,
    });
  }
  return routes;
}

function witnessForRegex(source) {
  return source
    .replace(/\[\^\/\]\+/gu, "w")
    .replace(/\[\^\/\]\*/gu, "w")
    .replace(/\\d\+/gu, "3")
    .replace(/\\\//gu, "/")
    .replace(/\(\?:/gu, "")
    .replace(/[()]/gu, "")
    .replace(/^\^/u, "")
    .replace(/\$$/u, "");
}

function nearestMethod(source, index, endIndex) {
  const forward = source.slice(endIndex, endIndex + 300);
  const forwardMethod = /request\.method === "([A-Z]+)"/u.exec(forward);
  if (forwardMethod !== null) return forwardMethod[1];
  const before = source.slice(Math.max(0, index - 400), index);
  const methods = [...before.matchAll(/request\.method === "([A-Z]+)"/gu)];
  return methods.length > 0 ? methods[methods.length - 1][1] : "*";
}

function registryMatcher(entry) {
  if (entry.regex === null) {
    return {
      test: (method, path) =>
        (entry.method === "*" || entry.method === method) &&
        entry.template === path,
    };
  }
  const compiled = new RegExp(entry.regex, "u");
  if (!entry.regex.startsWith("^") || !entry.regex.endsWith("$")) {
    throw new Error(`registry pattern is not anchored: ${entry.template}`);
  }
  return {
    test: (method, path) =>
      (entry.method === "*" || entry.method === method) && compiled.test(path),
  };
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function verifyRoutes(registrySource, httpSource) {
  const entries = parseRegistryEntries(registrySource).map((entry) => ({
    ...entry,
    matches: registryMatcher(entry),
  }));
  const dispatch = parseDispatchRoutes(httpSource);
  const failures = [];

  for (const route of dispatch) {
    const witness =
      route.kind === "exact" ? route.path : witnessForRegex(route.regexSource);
    const methods = route.method === "*" ? METHODS : [route.method];
    const covered = methods.some((method) =>
      entries.some((entry) => entry.matches.test(method, witness)),
    );
    if (!covered) {
      failures.push(
        `dispatch route without registry entry: [${route.method}] ${route.kind === "exact" ? route.path : route.regexSource}`,
      );
    }
  }

  const dispatchMatchers = dispatch.map((route) =>
    route.kind === "exact"
      ? { test: (path) => route.path === path }
      : { test: (path) => route.regex.test(path) },
  );
  for (const entry of entries) {
    const witness =
      entry.regex === null ? entry.template : witnessForRegex(entry.regex);
    const covered = dispatchMatchers.some((matcher) => matcher.test(witness));
    if (!covered) {
      failures.push(
        `registry entry without dispatch route: [${entry.method}] ${entry.template}`,
      );
    }
  }

  return Object.freeze({
    registryEntries: entries.length,
    dispatchRoutes: dispatch.length,
    failures: Object.freeze(failures),
  });
}

async function main() {
  const [registrySource, httpSource] = await Promise.all([
    readFile(registryPath, "utf8"),
    readFile(httpPath, "utf8"),
  ]);
  const result = verifyRoutes(registrySource, httpSource);
  console.log(
    `routes gate: ${result.registryEntries} registry entries, ${result.dispatchRoutes} dispatch routes`,
  );
  if (result.failures.length > 0) {
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    "routes gate: registry and dispatch are bidirectionally consistent",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
