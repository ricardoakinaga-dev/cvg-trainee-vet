export class PersistenceMappingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PersistenceMappingError";
  }
}
