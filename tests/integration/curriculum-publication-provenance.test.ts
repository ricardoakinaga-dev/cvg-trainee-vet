import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { provisionCurriculumForm } from "./curriculum-native-fixtures.js";
import {
  curriculumBlueprintVersions,
  curriculumFormVersions,
} from "../../packages/persistence/src/schema.js";
import {
  closeLivePostgresHarness,
  liveDatabaseUrl,
  openLivePostgresHarness,
  type LivePostgresHarness,
} from "./live-postgres-harness.js";

async function withHarness(
  work: (harness: LivePostgresHarness) => Promise<void>,
) {
  if (process.env.CVG_OWNED_DISPOSABLE_BINDING_DATABASE !== "true")
    throw new Error("Provenance fixtures require an owned disposable database");
  const harness = await openLivePostgresHarness();
  try {
    expect(harness.applicationRole).toMatchObject({
      isSuperuser: false,
      bypassesRls: false,
    });
    expect(harness.adminRole).toMatchObject({
      isSuperuser: false,
      bypassesRls: true,
    });
    await work(harness);
  } finally {
    await closeLivePostgresHarness(harness);
  }
}

function sqlState(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current = error;
  while (
    current !== null &&
    typeof current === "object" &&
    !seen.has(current)
  ) {
    seen.add(current);
    if ("code" in current && typeof current.code === "string")
      return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

describe.skipIf(
  process.env.CVG_RUN_LIVE_DB_TESTS !== "true" || liveDatabaseUrl === undefined,
)(
  "native immutable publication audit correspondence (technical fixtures only)",
  () => {
    it("admits decisions bound to their exact blueprint and form resources", async () => {
      await withHarness(async (harness) => {
        const fixture = await provisionCurriculumForm(harness);
        expect(fixture.blueprintVersionId).not.toBe(fixture.formVersionId);
        expect(fixture.formItems).toHaveLength(33);
      });
    });
    for (const subject of ["approval", "publication"] as const) {
      it.each([
        "action",
        "resource type",
        "resource identity",
        "actor kind",
        "actor identity",
        "scope",
        "outcome",
        "time",
      ] as const)(
        `rejects ${subject} decision with wrong %s`,
        async (field) => {
          await withHarness(async (harness) => {
            let caught: unknown;
            let formVersionId: string | undefined;
            let blueprintVersionId: string | undefined;
            try {
              await provisionCurriculumForm(
                harness,
                33,
                undefined,
                (context) => {
                  formVersionId = context.formVersionId;
                  blueprintVersionId = context.blueprintVersionId;
                  const patch =
                    field === "action"
                      ? { action: "UNRELATED_SYNTHETIC_EVENT" }
                      : field === "resource type"
                        ? { resourceType: "synthetic_unrelated_resource" }
                        : field === "resource identity"
                          ? { resourceId: context.participantId }
                          : field === "actor kind"
                            ? { actorKind: "ANONYMOUS", principalId: null }
                            : field === "actor identity"
                              ? { principalId: context.participantId }
                              : field === "scope"
                                ? { scopeId: randomUUID() }
                                : field === "outcome"
                                  ? { outcome: "DENIED" }
                                  : {
                                      occurredAt: new Date(
                                        (subject === "approval"
                                          ? Date.parse(
                                              "2026-10-01T12:00:00.000Z",
                                            )
                                          : Date.parse(
                                              "2026-10-02T12:00:00.000Z",
                                            )) + 1,
                                      ),
                                    };
                  return { [subject]: patch };
                },
              );
            } catch (error) {
              caught = error;
            }
            expect(sqlState(caught)).toBe("23514");
            if (!formVersionId || !blueprintVersionId)
              throw new Error("Decision fixture was not reached");
            expect(
              await harness.admin.db
                .select()
                .from(curriculumFormVersions)
                .where(eq(curriculumFormVersions.id, formVersionId)),
            ).toEqual([]);
            if (subject === "approval") {
              expect(
                await harness.admin.db
                  .select()
                  .from(curriculumBlueprintVersions)
                  .where(
                    eq(curriculumBlueprintVersions.id, blueprintVersionId),
                  ),
              ).toEqual([]);
            }
          });
        },
      );
    }
  },
);
