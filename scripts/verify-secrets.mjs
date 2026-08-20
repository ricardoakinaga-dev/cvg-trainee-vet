import { scanProject, summarizeSecretFindings } from "./secret-scanner.mjs";

const root = process.env.CVG_SECRET_SCAN_ROOT ?? process.cwd();
const findings = await scanProject(root);

if (findings.length > 0) {
  console.error(`secret scan failed: ${summarizeSecretFindings(findings)}`);
  process.exitCode = 1;
} else {
  console.log("secret scan: clean");
}
