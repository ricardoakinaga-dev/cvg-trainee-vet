export class LearningAssignmentDomainError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LearningAssignmentDomainError";
  }
}
