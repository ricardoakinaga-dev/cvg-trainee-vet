import { describe, expect, it } from "vitest";

import { createAppealPersistence } from "./appeal-persistence.js";
import { createAssessmentWorkflowPersistence } from "./assessment-workflow-persistence.js";
import { createFeedbackTicketPersistence } from "./feedback-ticket-persistence.js";
import { createLearningAssignmentPersistence } from "./learning-assignment-persistence.js";

describe("learning state repository composition", () => {
  it("keeps each aggregate persistence surface independently composable", () => {
    const database = {} as never;

    expect(createLearningAssignmentPersistence(database)).toEqual(
      expect.objectContaining({
        saveAssignment: expect.any(Function),
        findAssignment: expect.any(Function),
      }),
    );
    expect(createAssessmentWorkflowPersistence(database)).toEqual(
      expect.objectContaining({
        saveWorkflow: expect.any(Function),
        findWorkflow: expect.any(Function),
      }),
    );
    expect(createFeedbackTicketPersistence(database)).toEqual(
      expect.objectContaining({
        saveTicket: expect.any(Function),
        findTicket: expect.any(Function),
        listFeedbackTickets: expect.any(Function),
      }),
    );
    expect(createAppealPersistence(database)).toEqual(
      expect.objectContaining({
        saveAppealState: expect.any(Function),
        findAppealState: expect.any(Function),
      }),
    );
  });
});
