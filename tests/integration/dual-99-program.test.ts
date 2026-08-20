import { describe, expect, it } from "vitest";

import {
  buildDual99Report,
  loadDual99Program,
  validateDual99Program,
} from "../../scripts/verify-dual-99-program.mjs";

describe("Dual99 executable program", () => {
  it("accepts the frozen 32-cell baseline and the complete overlay backlog", () => {
    const program = loadDual99Program();

    expect(validateDual99Program(program)).toEqual([]);
    expect(buildDual99Report(program)).toMatchObject({
      programId: "CVG-DUAL-99",
      maturityItems: 16,
      codeQualityItems: 16,
      criticalDomains: 8,
      highFindings: 6,
      requirements: 145,
      backlogTasks: 46,
      eligibleForIndependentReaudit: false,
      releaseDisposition: "PILOT_BLOCKED",
    });
  });

  it("rejects score promotion, missing gates and backlog drift", () => {
    const program = loadDual99Program();
    const invalidProgram = {
      ...program,
      releaseDisposition: "PILOT_APPROVED",
      tracks: program.tracks.map((track) =>
        track.id === "MATURITY" ? { ...track, targetScore: 98 } : track,
      ),
      gates: program.gates.slice(0, -1),
      backlog: {
        ...program.backlog,
        taskIds: program.backlog.taskIds.slice(1),
      },
    };

    const errors = validateDual99Program(invalidProgram);

    expect(errors).toEqual(
      expect.arrayContaining([
        "release disposition must remain PILOT_BLOCKED",
        "track MATURITY targetScore must be 99",
        "required gate G99-8 is missing",
        "backlog taskIds must contain exactly 46 unique IDs",
      ]),
    );
  });
});
