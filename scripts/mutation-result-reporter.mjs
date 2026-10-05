import { JsonReporter } from "vitest/reporters";

function errors(values) {
  return (values ?? []).map((error) => ({
    name: error.name ?? "Error",
    message: error.message ?? "",
  }));
}

export default class MutationResultReporter extends JsonReporter {
  hookErrors = [];
  hookedEntities = new Set();

  onHookStart({ entity }) {
    this.hookedEntities.add(entity);
  }

  onHookEnd({ entity }) {
    const result =
      entity.type === "test" ? entity.result().errors : entity.errors();
    this.hookErrors.push(...errors(result));
  }

  async onTestRunEnd(modules, unhandledErrors, reason) {
    this.harness = {
      runId: process.env.CVG_MUTATION_RUN_ID,
      reason,
      unhandledErrors: errors(unhandledErrors),
      suiteErrors: [
        ...this.hookErrors,
        ...[...this.hookedEntities].flatMap((entity) =>
          errors(
            entity.type === "test" ? entity.result().errors : entity.errors(),
          ),
        ),
        ...modules.flatMap((module) =>
          [module, ...module.children.allSuites()].flatMap((suite) =>
            errors(suite.errors()),
          ),
        ),
      ],
      tests: modules.flatMap((module) =>
        [...module.children.allTests()].map((test) => ({
          file: module.moduleId,
          fullName: [
            ...(test.task.suite ? parentNames(test.task.suite) : []),
            test.name,
          ].join(" "),
          errors: errors(test.result().errors),
          retryCount: test.diagnostic()?.retryCount,
          repeatCount: test.diagnostic()?.repeatCount,
        })),
      ),
    };
    await super.onTestRunEnd(modules);
  }

  async writeReport(text) {
    await super.writeReport(
      JSON.stringify({ ...JSON.parse(text), cvgHarness: this.harness }),
    );
  }
}

function parentNames(suite) {
  return [...(suite.suite ? parentNames(suite.suite) : []), suite.name];
}
