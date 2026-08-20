import { readFile } from "node:fs/promises";
import { assertReleaseManifest } from "./release-manifest.mjs";

const manifestPath =
  process.env.CVG_RELEASE_MANIFEST ??
  "infra/production/release-manifest.example.json";
const manifest = assertReleaseManifest(
  JSON.parse(await readFile(manifestPath, "utf8")),
);

console.log(
  JSON.stringify({
    status: "PASS",
    manifestPath,
    releaseId: manifest.releaseId,
    image: manifest.image,
    migrationStrategy: manifest.migrationStrategy,
    canary: `${manifest.canaryService}${manifest.healthPath}`,
    canaryStableProbes: manifest.canaryStableProbes,
    sourceSha: manifest.sourceSha,
    rollbackSourceSha: manifest.rollbackSourceSha,
    sourceDigestBinding: true,
    immutableRelease: true,
    rollbackDigestPresent: true,
  }),
);
