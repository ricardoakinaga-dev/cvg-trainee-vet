import { executeLiveIntegration } from "./live-integration-environment.mjs";

const controller = new AbortController();
let receivedSignal;

const requestStop = (signal) => {
  receivedSignal = signal;
  controller.abort();
};
const handleSigint = () => requestStop("SIGINT");
const handleSigterm = () => requestStop("SIGTERM");
process.once("SIGINT", handleSigint);
process.once("SIGTERM", handleSigterm);

try {
  await executeLiveIntegration({
    environment: process.env,
    signal: controller.signal,
  });
} catch (error) {
  console.error(
    error instanceof Error
      ? `live integration failed: ${error.message}`
      : "live integration failed",
  );
  process.exitCode = receivedSignal === "SIGINT" ? 130 : 1;
} finally {
  process.removeListener("SIGINT", handleSigint);
  process.removeListener("SIGTERM", handleSigterm);
}
