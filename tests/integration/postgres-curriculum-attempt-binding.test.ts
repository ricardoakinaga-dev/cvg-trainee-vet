import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeLivePostgresHarness,
  liveDatabaseUrl,
  openLivePostgresHarness,
  type LivePostgresHarness,
} from "./live-postgres-harness.js";

describe.skipIf(
  process.env.CVG_RUN_LIVE_DB_TESTS !== "true" || liveDatabaseUrl === undefined,
)("native curriculum attempt binding persistence", () => {
  let harness: LivePostgresHarness | undefined;
  beforeEach(async () => {
    harness = await openLivePostgresHarness();
  });
  afterEach(async () => {
    if (harness !== undefined) await closeLivePostgresHarness(harness);
    harness = undefined;
  });

  it("has explicit immutable published-form and attempt-binding relations", async () => {
    if (harness === undefined)
      throw new Error("Real PostgreSQL harness required");
    expect(harness.applicationRole).toMatchObject({
      isSuperuser: false,
      bypassesRls: false,
    });
    const rows = await harness.application.db.execute<{
      name: string | null;
    }>(sql`
      select to_regclass(required.name)::text as name
      from unnest(array[
        'public.curriculum_blueprint_versions',
        'public.curriculum_form_versions',
        'public.curriculum_form_items',
        'public.curriculum_activity_forms',
        'public.curriculum_attempt_forms',
        'public.curriculum_attempt_items'
      ]) as required(name)
    `);
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.name !== null)).toBe(true);
    const security = await harness.application.db.execute<{
      name: string;
      enabled: boolean;
      forced: boolean;
    }>(sql`
      select relname as name, relrowsecurity as enabled, relforcerowsecurity as forced
      from pg_class
      where oid in (
        'public.curriculum_blueprint_versions'::regclass,
        'public.curriculum_form_versions'::regclass,
        'public.curriculum_form_items'::regclass,
        'public.curriculum_activity_forms'::regclass,
        'public.curriculum_attempt_forms'::regclass,
        'public.curriculum_attempt_items'::regclass
      )
    `);
    expect(security).toHaveLength(6);
    expect(security.every((row) => row.enabled && row.forced)).toBe(true);
  });
});
