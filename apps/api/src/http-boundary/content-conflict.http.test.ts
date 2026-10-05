import { describe, expect, it, vi } from "vitest";

import {
  advanceContent,
  type AdvanceContentCommand,
  type ContentUseCaseDependencies,
} from "@cvg/application";

import { handleApiRequest } from "../http.js";
import { dependencies } from "./fixtures.js";

describe("content optimistic concurrency HTTP boundary", () => {
  it.each([
    ["PersistenceConflictError", 409, "state_conflict"],
    ["Error", 500, "internal_error"],
  ] as const)(
    "maps %s to %s without partial events",
    async (name, status, code) => {
      const contentId = "11111111-1111-4111-8111-111111111111";
      const scopeId = "22222222-2222-4222-8222-222222222222";
      const publish = vi.fn(async () => undefined);
      const append = vi.fn(async () => undefined);
      const save = vi.fn(async () => {
        throw Object.assign(new Error("synthetic private database detail"), {
          name,
        });
      });
      const ports: ContentUseCaseDependencies = {
        idFactory: () => "33333333-3333-4333-8333-333333333333",
        transaction: {
          run: async (work) =>
            work({
              content: {
                find: async () => ({
                  contentId,
                  scopeId,
                  version: 1,
                  status: "AUTOVERIFICADO",
                }),
                save,
              },
              eventPublisher: { publish },
              audit: { append },
            }),
        },
      };
      const response = await handleApiRequest(
        {
          method: "POST",
          path: `/api/v1/internal/content/${contentId}/transition`,
          body: { scopeId, version: 1, event: "INICIAR_REVISAO_CLINICA" },
        },
        dependencies({
          authenticate: async () => ({
            principalId: "author",
            accountStatus: "ACTIVE",
            roles: ["AUTHOR"],
            scopes: [scopeId],
          }),
          advanceContent: (command: AdvanceContentCommand) =>
            advanceContent(command, ports),
        }),
      );
      expect(response.status).toBe(status);
      expect(response.body).toMatchObject({ success: false, error: { code } });
      expect(JSON.stringify(response.body)).not.toContain(
        "synthetic private database detail",
      );
      expect(save).toHaveBeenCalledOnce();
      expect(publish).not.toHaveBeenCalled();
      expect(append).not.toHaveBeenCalled();
    },
  );
});
