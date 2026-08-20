import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { createAuditEntry, type AuditPort } from "./audit.js";
import type { AccountStatus, Role } from "./authorization.js";
import { ApplicationError, toApplicationError } from "./errors.js";
import {
  createSession,
  type CreatedSession,
  type SessionRepositoryPort,
} from "./session.js";

const passwordHashAlgorithm = "scrypt";
const passwordCost = 16_384;
const passwordBlockSize = 8;
const passwordParallelization = 1;
const passwordKeyLength = 64;
const passwordSaltLength = 16;
const minimumPasswordLength = 12;
const maximumPasswordLength = 128;

type ScryptOptions = Readonly<{
  readonly N: number;
  readonly r: number;
  readonly p: number;
  readonly maxmem: number;
}>;

function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error !== null) {
        reject(error);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

export type PasswordAccountRecord = Readonly<{
  readonly accountId: string;
  readonly accountStatus: AccountStatus;
  readonly sessionGeneration: number;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly passwordHash: string | null;
}>;

export interface PasswordAuthAccountPort {
  readonly findByLogin: (
    login: string,
  ) => Promise<PasswordAccountRecord | null>;
  readonly findById: (
    accountId: string,
  ) => Promise<PasswordAccountRecord | null>;
  readonly setPassword: (
    accountId: string,
    passwordHash: string,
  ) => Promise<void>;
}

export interface PasswordAuthTransactionalOperations {
  readonly account: PasswordAuthAccountPort;
  readonly sessions: SessionRepositoryPort;
  readonly audit: AuditPort;
}

export interface PasswordAuthTransactionPort {
  readonly run: <Result>(
    work: (operations: PasswordAuthTransactionalOperations) => Promise<Result>,
  ) => Promise<Result>;
}

export interface PasswordAuthUseCaseDependencies {
  readonly idFactory: () => string;
  readonly transaction: PasswordAuthTransactionPort;
}

export type LoginWithPasswordCommand = Readonly<{
  readonly login: string;
  readonly password: string;
  readonly sessionExpiresInSeconds: number;
  readonly correlationId: string;
  readonly now?: Date;
  readonly sessionTokenFactory?: () => string;
  readonly sessionIdFactory?: () => string;
}>;

export type LoggedInPassword = Readonly<{
  readonly accountId: string;
  readonly session: CreatedSession;
}>;

export type SetAccountPasswordCommand = Readonly<{
  readonly principalId: string;
  readonly currentPassword: string;
  readonly password: string;
  readonly correlationId: string;
  readonly now?: Date;
}>;

function assertNonEmpty(value: string, field: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("validation_error", `${field} is required`);
  }
}

function normalizeLogin(value: string): string {
  assertNonEmpty(value, "login");
  const login = value.trim().toLowerCase();
  if (login.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(login)) {
    throw new ApplicationError("validation_error", "login is invalid");
  }
  return login;
}

function assertPasswordPolicy(value: string): void {
  if (
    typeof value !== "string" ||
    value.length < minimumPasswordLength ||
    value.length > maximumPasswordLength
  ) {
    throw new ApplicationError(
      "validation_error",
      "password is outside the allowed range",
    );
  }
}

function assertLifetime(seconds: number): void {
  if (
    !Number.isInteger(seconds) ||
    seconds < 60 ||
    seconds > 7 * 24 * 60 * 60
  ) {
    throw new ApplicationError(
      "validation_error",
      "sessionExpiresInSeconds is outside the allowed range",
    );
  }
}

function assertDate(value: Date): void {
  if (Number.isNaN(value.getTime())) {
    throw new ApplicationError("validation_error", "now is invalid");
  }
}

function encodeHash(
  salt: Buffer,
  derivedKey: Buffer,
  cost = passwordCost,
  blockSize = passwordBlockSize,
  parallelization = passwordParallelization,
): string {
  return [
    passwordHashAlgorithm,
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

type ParsedHash = Readonly<{
  readonly cost: number;
  readonly blockSize: number;
  readonly parallelization: number;
  readonly salt: Buffer;
  readonly derivedKey: Buffer;
}>;

function parseHash(encoded: string): ParsedHash | null {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== passwordHashAlgorithm) return null;
  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  if (
    !Number.isSafeInteger(cost) ||
    cost < passwordCost ||
    cost > 1_048_576 ||
    (cost & (cost - 1)) !== 0 ||
    blockSize !== passwordBlockSize ||
    parallelization !== passwordParallelization
  ) {
    return null;
  }
  try {
    const salt = Buffer.from(parts[4] ?? "", "base64url");
    const derivedKey = Buffer.from(parts[5] ?? "", "base64url");
    if (
      salt.length !== passwordSaltLength ||
      derivedKey.length !== passwordKeyLength
    ) {
      return null;
    }
    return Object.freeze({
      cost,
      blockSize,
      parallelization,
      salt,
      derivedKey,
    });
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password);
  const salt = randomBytes(passwordSaltLength);
  const derivedKey = (await scryptAsync(password, salt, passwordKeyLength, {
    N: passwordCost,
    r: passwordBlockSize,
    p: passwordParallelization,
    maxmem: 32 * 1024 * 1024,
  })) as Buffer;
  return encodeHash(salt, derivedKey);
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  if (typeof password !== "string" || typeof encodedHash !== "string") {
    return false;
  }
  const parsed = parseHash(encodedHash);
  if (parsed === null) return false;
  try {
    const derivedKey = (await scryptAsync(
      password,
      parsed.salt,
      parsed.derivedKey.length,
      {
        N: parsed.cost,
        r: parsed.blockSize,
        p: parsed.parallelization,
        maxmem: 32 * 1024 * 1024,
      },
    )) as Buffer;
    return (
      derivedKey.length === parsed.derivedKey.length &&
      timingSafeEqual(derivedKey, parsed.derivedKey)
    );
  } catch {
    return false;
  }
}

function assertCommand(command: Readonly<{ correlationId: string }>): void {
  assertNonEmpty(command.correlationId, "correlationId");
}

function normalizeAuthError(error: unknown): ApplicationError {
  return error instanceof ApplicationError ? error : toApplicationError(error);
}

export async function loginWithPassword(
  command: LoginWithPasswordCommand,
  dependencies: PasswordAuthUseCaseDependencies,
): Promise<LoggedInPassword> {
  const login = normalizeLogin(command.login);
  assertPasswordPolicy(command.password);
  assertCommand(command);
  assertLifetime(command.sessionExpiresInSeconds);
  const now = command.now ?? new Date();
  assertDate(now);

  try {
    return await dependencies.transaction.run(async (operations) => {
      const account = await operations.account.findByLogin(login);
      const candidateHash =
        account?.passwordHash ??
        (await hashPassword(randomBytes(passwordSaltLength).toString("hex")));
      const validPassword = await verifyPassword(
        command.password,
        candidateHash,
      );
      if (
        !validPassword ||
        account === null ||
        account.accountStatus !== "ACTIVE"
      ) {
        throw new ApplicationError("unauthenticated", "Invalid credentials");
      }

      const session = await createSession(
        {
          accountId: account.accountId,
          accountStatus: account.accountStatus,
          sessionGeneration: account.sessionGeneration,
          roles: account.roles,
          scopes: account.scopes,
          expiresInSeconds: command.sessionExpiresInSeconds,
          ...(command.sessionTokenFactory === undefined
            ? {}
            : { tokenFactory: command.sessionTokenFactory }),
          ...(command.sessionIdFactory === undefined
            ? {}
            : { sessionIdFactory: command.sessionIdFactory }),
        },
        operations.sessions,
        now,
      );
      await operations.audit.append(
        createAuditEntry({
          auditId: dependencies.idFactory(),
          principalId: account.accountId,
          action: "session.login",
          resourceType: "account_session",
          resourceId: session.sessionId,
          outcome: "SUCCESS",
          reasonCode: "password_authentication",
          requestId: command.correlationId,
          correlationId: command.correlationId,
          occurredAt: now.toISOString(),
        }),
      );
      return Object.freeze({ accountId: account.accountId, session });
    });
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export async function setAccountPassword(
  command: SetAccountPasswordCommand,
  dependencies: PasswordAuthUseCaseDependencies,
): Promise<void> {
  assertNonEmpty(command.principalId, "principalId");
  assertPasswordPolicy(command.currentPassword);
  assertCommand(command);
  assertPasswordPolicy(command.password);
  if (command.password === command.currentPassword) {
    throw new ApplicationError(
      "validation_error",
      "new password must differ from the current password",
    );
  }
  const now = command.now ?? new Date();
  assertDate(now);

  try {
    await dependencies.transaction.run(async (operations) => {
      const account = await operations.account.findById(command.principalId);
      const currentPasswordValid =
        account !== null &&
        account.accountStatus === "ACTIVE" &&
        account.passwordHash !== null &&
        (await verifyPassword(command.currentPassword, account.passwordHash));
      if (!currentPasswordValid) {
        throw new ApplicationError(
          "unauthenticated",
          "Current authentication proof is invalid",
        );
      }
      const passwordHash = await hashPassword(command.password);
      await operations.account.setPassword(command.principalId, passwordHash);
      await operations.sessions.revokeAll(command.principalId, now);
      await operations.audit.append(
        createAuditEntry({
          auditId: dependencies.idFactory(),
          principalId: command.principalId,
          action: "account.password.updated",
          resourceType: "account",
          resourceId: command.principalId,
          outcome: "SUCCESS",
          reasonCode: "authenticated_password_update",
          requestId: command.correlationId,
          correlationId: command.correlationId,
          occurredAt: now.toISOString(),
        }),
      );
    });
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export const passwordPolicy = Object.freeze({
  minLength: minimumPasswordLength,
  maxLength: maximumPasswordLength,
});
