import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("API runtime native close completion", () => {
  it.each(["initialization", "resources", "failure"])(
    "settles %s callbacks after closing its real listener",
    (stage) => {
      const moduleUrl = new URL("./api-runtime-lifecycle.ts", import.meta.url);
      const script = `
        import {createServer} from 'node:http';
        import {createApiRuntimeLifecycle} from ${JSON.stringify(moduleUrl.href)};
        const server = createServer();
        const stage = ${JSON.stringify(stage)};
        const order = [];
        const originalError = new Error('synthetic close failure');
        let drained = false, rejectedOriginal = false;
        const held = label => new Promise((resolve, reject) => {
          setTimeout(() => {
            order.push(label);
            if (stage === 'failure' && label === 'resources') reject(originalError);
            else resolve();
          }, 30).unref();
        });
        const runtime = createApiRuntimeLifecycle({
          listen: () => new Promise(resolve => server.listen(0, '127.0.0.1', resolve)),
          beginInitialization: () => undefined,
          cancelInitialization: () => order.push('cancel'),
          closeServer: () => new Promise((resolve, reject) => server.close(error => {
            if(error) reject(error);
            else { order.push('listener-closed'); resolve(); }
          })),
          awaitInitialization: () => stage === 'initialization' ? held('initialization') : Promise.resolve(),
          closeIntegrations: () => held('resources'),
        });
        await runtime.listen();
        const first = runtime.close();
        const repeatedCloseSame = first === runtime.close();
        let admissionRejected = false;
        await runtime.listen().catch(() => { admissionRejected = true; });
        void first.then(() => { drained = true; order.push('drained'); }, error => {
          rejectedOriginal = error === originalError;
          order.push('rejected');
        });
        process.once('beforeExit', () => console.log(JSON.stringify({
          stage, order, drained, rejectedOriginal, repeatedCloseSame, admissionRejected,
          listenerClosed: !server.listening,
          remainingTimeouts: process.getActiveResourcesInfo().filter(kind => kind === 'Timeout').length,
        })));
      `;
      const child = spawnSync(
        process.execPath,
        ["--experimental-strip-types", "--input-type=module", "-e", script],
        { encoding: "utf8", timeout: 3000 },
      );
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(0);
      expect(child.signal).toBeNull();
      const receipt = JSON.parse(child.stdout.trim()) as {
        order: string[];
        drained: boolean;
        rejectedOriginal: boolean;
        repeatedCloseSame: boolean;
        admissionRejected: boolean;
        listenerClosed: boolean;
        remainingTimeouts: number;
      };
      console.log("R46_API_NATIVE_RECEIPT", JSON.stringify(receipt));
      expect(receipt.repeatedCloseSame).toBe(true);
      expect(receipt.admissionRejected).toBe(true);
      expect(receipt.listenerClosed).toBe(true);
      expect(receipt.remainingTimeouts).toBe(0);
      expect(receipt.order).toEqual(
        stage === "initialization"
          ? [
              "cancel",
              "listener-closed",
              "initialization",
              "resources",
              "drained",
            ]
          : [
              "cancel",
              "listener-closed",
              "resources",
              stage === "failure" ? "rejected" : "drained",
            ],
      );
      expect(receipt.drained).toBe(stage !== "failure");
      expect(receipt.rejectedOriginal).toBe(stage === "failure");
    },
  );
});
