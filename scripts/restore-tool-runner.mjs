import { execFile } from "node:child_process";
import { basename, join } from "node:path";
import { promisify } from "node:util";

import { formatRestoreToolFailure } from "./restore-integrity-contract.mjs";

const execFileAsync = promisify(execFile);

export function createRestoreToolRunner({ cwd, execute = execFileAsync }) {
  return async function runTool(
    program,
    args,
    env,
    timeout = 120_000,
    { suppressStderr = false } = {},
  ) {
    try {
      return await execute(program, args, {
        cwd,
        env,
        timeout,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      });
    } catch (error) {
      throw new Error(
        formatRestoreToolFailure(basename(program), error?.stderr, {
          suppressStderr,
        }),
      );
    }
  };
}

export function runRoleProvisioningCommand({
  runTool,
  pgBin,
  targetDatabase,
  socketDirectory,
  port,
  sqlPath,
  env,
}) {
  return runTool(
    join(pgBin, "psql"),
    [
      "--no-psqlrc",
      "--no-password",
      "--dbname",
      targetDatabase,
      "--username",
      "postgres",
      "--host",
      socketDirectory,
      "--port",
      String(port),
      "--set=ON_ERROR_STOP=1",
      "--file",
      sqlPath,
    ],
    env,
    120_000,
    { suppressStderr: true },
  );
}
