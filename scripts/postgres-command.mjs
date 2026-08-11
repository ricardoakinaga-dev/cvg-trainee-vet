export function buildDockerExecCommand({
  container,
  program,
  args,
  interactive = false,
}) {
  if (!/^[A-Za-z0-9_.-]+$/u.test(container)) {
    throw new Error("PostgreSQL Docker container identifier is invalid");
  }
  return Object.freeze({
    program: "docker",
    args: Object.freeze([
      "exec",
      ...(interactive ? ["-i"] : []),
      "-e",
      "PGPASSWORD",
      container,
      program,
      ...args,
    ]),
  });
}
