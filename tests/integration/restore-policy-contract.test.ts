import { describe, expect, it } from "vitest";

import { verifyIndexerPolicyContract } from "../../scripts/restore-policy-contract.mjs";

const serviceContext =
  "current_setting('cvg.service_role'::text, true) = 'content-indexer'::text";
const publishedVersion = `EXISTS ( SELECT 1 FROM content_versions version_record WHERE ((version_record.content_id = ai_suggestions.content_id) AND (version_record.version = ai_suggestions.version) AND (version_record.status = 'PUBLICADO'::text)))`;

const expectedPolicies = [
  {
    policyname: "content_versions_indexer_select_policy",
    tablename: "content_versions",
    permissive: "PERMISSIVE",
    roles: ["public"],
    cmd: "SELECT",
    qual: `((${serviceContext}) AND (status = 'PUBLICADO'::text))`,
    with_check: null,
  },
  {
    policyname: "ai_suggestions_indexer_select_policy",
    tablename: "ai_suggestions",
    permissive: "PERMISSIVE",
    roles: ["public"],
    cmd: "SELECT",
    qual: `((${serviceContext}) AND (${publishedVersion}))`,
    with_check: null,
  },
  {
    policyname: "ai_suggestions_indexer_insert_policy",
    tablename: "ai_suggestions",
    permissive: "PERMISSIVE",
    roles: ["public"],
    cmd: "INSERT",
    qual: null,
    with_check: `((${serviceContext}) AND (${publishedVersion}))`,
  },
  {
    policyname: "ai_suggestions_indexer_update_policy",
    tablename: "ai_suggestions",
    permissive: "PERMISSIVE",
    roles: ["public"],
    cmd: "UPDATE",
    qual: `((${serviceContext}) AND (${publishedVersion}))`,
    with_check: `((${serviceContext}) AND (${publishedVersion}))`,
  },
];

describe("restored indexer policy contract", () => {
  it("accepts the expected tables, commands, role and restrictive predicates", () => {
    expect(verifyIndexerPolicyContract(expectedPolicies)).toBe(true);
  });

  it("rejects wrong policy metadata and duplicate or missing policies", () => {
    expect(
      verifyIndexerPolicyContract([
        { ...expectedPolicies[0], tablename: "ai_suggestions" },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
    expect(
      verifyIndexerPolicyContract([
        { ...expectedPolicies[0], cmd: "ALL" },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
    expect(
      verifyIndexerPolicyContract([
        { ...expectedPolicies[0], roles: ["public", "cvg_restore_op"] },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
    expect(
      verifyIndexerPolicyContract([...expectedPolicies, expectedPolicies[0]]),
    ).toBe(false);
    expect(verifyIndexerPolicyContract(expectedPolicies.slice(1))).toBe(false);
  });

  it("rejects missing service or publication checks and broad OR predicates", () => {
    expect(
      verifyIndexerPolicyContract([
        { ...expectedPolicies[0], qual: `status = 'PUBLICADO'::text` },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
    expect(
      verifyIndexerPolicyContract([
        {
          ...expectedPolicies[0],
          qual: (() => {
            const qual = expectedPolicies[0]?.qual;
            if (typeof qual !== "string")
              throw new Error("content policy qualifier required");
            return qual;
          })().replace("(status =", "(status::text ="),
        },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
    const decoyContentPublication = `(${serviceContext} AND EXISTS (SELECT 1 FROM content_versions AS other_version WHERE other_version.status = 'PUBLICADO'::text))`;
    expect(
      verifyIndexerPolicyContract([
        { ...expectedPolicies[0], qual: decoyContentPublication },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
    expect(
      verifyIndexerPolicyContract([
        ...expectedPolicies.slice(0, 1),
        {
          ...expectedPolicies[1],
          qual: `(${serviceContext} AND EXISTS (SELECT 1 FROM content_versions AS version_record WHERE version_record.content_id = ai_suggestions.content_id))`,
        },
        ...expectedPolicies.slice(2),
      ]),
    ).toBe(false);
    const splitVersionPublication = `(${serviceContext} AND EXISTS (SELECT 1 FROM content_versions AS version_record WHERE version_record.content_id = ai_suggestions.content_id AND version_record.version = ai_suggestions.version) AND EXISTS (SELECT 1 FROM content_versions AS other_version WHERE other_version.status = 'PUBLICADO'::text))`;
    expect(
      verifyIndexerPolicyContract([
        ...expectedPolicies.slice(0, 1),
        { ...expectedPolicies[1], qual: splitVersionPublication },
        ...expectedPolicies.slice(2),
      ]),
    ).toBe(false);
    expect(
      verifyIndexerPolicyContract([
        {
          ...expectedPolicies[0],
          qual: `(${serviceContext} AND status = 'PUBLICADO'::text) OR true`,
        },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
    expect(
      verifyIndexerPolicyContract([
        {
          ...expectedPolicies[0],
          qual: `(NOT (${serviceContext}) AND status = 'PUBLICADO'::text)`,
        },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
    expect(
      verifyIndexerPolicyContract([
        {
          ...expectedPolicies[0],
          qual: `(COALESCE(${serviceContext}, true) AND status = 'PUBLICADO'::text)`,
        },
        ...expectedPolicies.slice(1),
      ]),
    ).toBe(false);
  });
});
