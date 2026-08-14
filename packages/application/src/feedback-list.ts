import type { FeedbackTicketPriority, FeedbackTicketState } from "@cvg/domain";

import type { ScopedFeedbackTicket } from "./learning-state-use-cases.js";

export type FeedbackTicketListAudience = "PARTICIPANT" | "STAFF";

export type FeedbackTicketListContext = Readonly<{
  readonly audience: FeedbackTicketListAudience;
  readonly participantId?: string;
  readonly scopeId: string;
  readonly status?: FeedbackTicketState["status"];
  readonly priority?: FeedbackTicketPriority;
}>;

export interface FeedbackTicketReadPort {
  readonly list: (
    context: FeedbackTicketListContext,
  ) => Promise<readonly ScopedFeedbackTicket[]>;
}

function assertNonEmpty(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} is required`);
  }
}

export async function listFeedbackTicketStates(
  context: FeedbackTicketListContext,
  repository: FeedbackTicketReadPort,
): Promise<readonly ScopedFeedbackTicket[]> {
  assertNonEmpty(context.scopeId, "scopeId");
  if (context.audience === "PARTICIPANT") {
    assertNonEmpty(context.participantId, "participantId");
  }
  const result = await repository.list(context);
  if (!Array.isArray(result)) {
    throw new TypeError("feedback ticket list must be an array");
  }
  return Object.freeze(
    result.map((ticket) =>
      Object.freeze({
        scopeId: ticket.scopeId,
        state: Object.freeze({ ...ticket.state }),
      }),
    ),
  );
}
