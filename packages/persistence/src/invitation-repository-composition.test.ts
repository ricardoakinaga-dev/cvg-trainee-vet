import { describe, expect, it } from "vitest";

import { createInvitationOperations } from "./invitation-repository-support.js";

describe("invitation repository composition", () => {
  it("keeps account and invitation ports composable with shared audit/session ports", () => {
    const operations = createInvitationOperations({} as never);

    expect(operations).toEqual(
      expect.objectContaining({
        account: expect.objectContaining({
          createInvited: expect.any(Function),
          setPassword: expect.any(Function),
          activate: expect.any(Function),
        }),
        invitation: expect.objectContaining({
          create: expect.any(Function),
          findActive: expect.any(Function),
          accept: expect.any(Function),
        }),
        sessions: expect.any(Object),
        audit: expect.any(Object),
      }),
    );
  });
});
