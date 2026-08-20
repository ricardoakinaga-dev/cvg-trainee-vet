import type { InvitationUseCaseDependencies } from "@cvg/application";

import {
  createInvitationOperations,
  type DatabaseExecutor,
} from "./invitation-repository-support.js";

export {
  PersistenceConflictError,
  PersistenceMappingError,
  invitationRecordToRow,
  invitationRowToRecord,
} from "./invitation-repository-support.js";
export type { InvitationRowShape } from "./invitation-repository-support.js";

export function createInvitationUseCaseDependencies(
  db: DatabaseExecutor,
  idFactory: () => string,
): InvitationUseCaseDependencies {
  const operations = createInvitationOperations(db);
  return Object.freeze({
    idFactory,
    ...operations,
    transaction: {
      run: async <Result>(
        work: (current: typeof operations) => Promise<Result>,
      ): Promise<Result> =>
        db.transaction(async (transaction) =>
          work(createInvitationOperations(transaction)),
        ),
    },
  });
}
