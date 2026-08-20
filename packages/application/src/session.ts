import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { AccountStatus, Role } from "./authorization.js";

export type SessionPrincipal = Readonly<{
  readonly accountId: string;
  readonly accountStatus: AccountStatus;
  readonly sessionGeneration: number;
  readonly roles: readonly Role[];
  readonly scopes: readonly string[];
  readonly sessionCreatedAt?: Date;
  readonly sessionExpiresAt?: Date;
}>;

export type SessionRecord = SessionPrincipal &
  Readonly<{
    readonly sessionId: string;
    readonly tokenHash: string;
    readonly expiresAt: Date;
    readonly revokedAt: Date | null;
    readonly createdAt: Date;
    readonly lastSeenAt: Date;
  }>;

export interface SessionRepositoryPort {
  readonly create: (record: SessionRecord) => Promise<void>;
  readonly findActive: (
    tokenHash: string,
    now: Date,
  ) => Promise<SessionPrincipal | null>;
  readonly revoke: (tokenHash: string, revokedAt: Date) => Promise<void>;
  readonly revokeAll: (accountId: string, revokedAt: Date) => Promise<number>;
  readonly rotate?: (
    tokenHash: string,
    record: SessionRecord,
    rotatedAt: Date,
  ) => Promise<void>;
}

export type CreateSessionInput = Readonly<{
  readonly accountId: string;
  readonly sessionGeneration?: number;
  readonly expiresInSeconds: number;
  readonly tokenFactory?: () => string;
  readonly sessionIdFactory?: () => string;
  readonly sessionCreatedAt?: Date;
  readonly absoluteExpiresAt?: Date;
  readonly accountStatus?: AccountStatus;
  readonly roles?: readonly Role[];
  readonly scopes?: readonly string[];
}>;

export type CreatedSession = Readonly<{
  readonly sessionId: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly cookie: string;
}>;

export type RotateSessionInput = Readonly<{
  readonly expiresInSeconds: number;
  readonly tokenFactory?: () => string;
  readonly sessionIdFactory?: () => string;
}>;

const sessionCookieName = "__Host-cvg_session";
const maxSessionLifetimeSeconds = 7 * 24 * 60 * 60;

function assertAccountId(accountId: string): void {
  if (accountId.trim().length === 0) {
    throw new Error("accountId is required");
  }
}

function assertSessionGeneration(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("sessionGeneration is invalid");
  }
}

function assertToken(token: string): void {
  if (!/^[A-Za-z0-9_-]{32,256}$/u.test(token)) {
    throw new Error("session token is invalid");
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function defaultTokenFactory(): string {
  return randomBytes(32).toString("base64url");
}

function readCookieToken(cookieHeader: string | undefined): string | null {
  if (cookieHeader === undefined) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (name !== sessionCookieName) continue;
    const token = part.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{32,256}$/u.test(token) ? token : null;
  }

  return null;
}

export function clearSessionCookie(): string {
  return `${sessionCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

type SessionMaterial = Readonly<{
  readonly record: SessionRecord;
  readonly token: string;
  readonly expiresAt: Date;
}>;

function createSessionMaterial(
  input: CreateSessionInput,
  now: Date,
): SessionMaterial {
  assertAccountId(input.accountId);
  if (
    !Number.isInteger(input.expiresInSeconds) ||
    input.expiresInSeconds <= 0 ||
    input.expiresInSeconds > maxSessionLifetimeSeconds
  ) {
    throw new Error("expiresInSeconds is outside the allowed range");
  }
  if (Number.isNaN(now.getTime())) throw new Error("now is invalid");

  const token = (input.tokenFactory ?? defaultTokenFactory)();
  assertToken(token);
  const sessionGeneration = input.sessionGeneration ?? 0;
  assertSessionGeneration(sessionGeneration);
  const sessionId = (input.sessionIdFactory ?? randomUUID)();
  assertAccountId(sessionId);
  const requestedExpiresAt = new Date(
    now.getTime() + input.expiresInSeconds * 1_000,
  );
  const absoluteExpiresAt = input.absoluteExpiresAt;
  if (
    absoluteExpiresAt !== undefined &&
    Number.isNaN(absoluteExpiresAt.getTime())
  ) {
    throw new Error("absoluteExpiresAt is invalid");
  }
  const expiresAt =
    absoluteExpiresAt === undefined || absoluteExpiresAt >= requestedExpiresAt
      ? requestedExpiresAt
      : new Date(absoluteExpiresAt.getTime());
  if (expiresAt <= now)
    throw new Error("session absolute lifetime has elapsed");
  const sessionCreatedAt = input.sessionCreatedAt ?? now;
  if (Number.isNaN(sessionCreatedAt.getTime()) || sessionCreatedAt > now) {
    throw new Error("sessionCreatedAt is invalid");
  }
  const record: SessionRecord = Object.freeze({
    sessionId,
    accountId: input.accountId,
    accountStatus: input.accountStatus ?? "ACTIVE",
    sessionGeneration,
    roles: Object.freeze([...(input.roles ?? [])]),
    scopes: Object.freeze([...(input.scopes ?? [])]),
    tokenHash: hashSessionToken(token),
    expiresAt,
    revokedAt: null,
    // Keep the logical session origin across rotations. The persistence
    // adapter maps this field to the session row's created_at, so a second
    // rotation cannot extend the absolute lifetime window.
    createdAt: new Date(sessionCreatedAt.getTime()),
    lastSeenAt: new Date(now.getTime()),
    sessionCreatedAt: new Date(sessionCreatedAt.getTime()),
    sessionExpiresAt: new Date(expiresAt.getTime()),
  });

  return Object.freeze({ record, token, expiresAt });
}

function createdSession(material: SessionMaterial, now: Date) {
  const expiresInSeconds = Math.max(
    1,
    Math.ceil((material.expiresAt.getTime() - now.getTime()) / 1_000),
  );
  return Object.freeze({
    sessionId: material.record.sessionId,
    token: material.token,
    expiresAt: material.expiresAt,
    cookie: `${sessionCookieName}=${material.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${expiresInSeconds}`,
  });
}

export async function createSession(
  input: CreateSessionInput,
  repository: SessionRepositoryPort,
  now: Date = new Date(),
): Promise<CreatedSession> {
  const material = createSessionMaterial(input, now);
  await repository.create(material.record);
  return createdSession(material, now);
}

export async function rotateSession(
  cookieHeader: string | undefined,
  input: RotateSessionInput,
  repository: SessionRepositoryPort,
  now: Date = new Date(),
): Promise<CreatedSession | null> {
  if (Number.isNaN(now.getTime())) return null;
  const token = readCookieToken(cookieHeader);
  if (token === null) return null;
  if (repository.rotate === undefined) {
    throw new Error("session rotation is not configured");
  }
  const tokenHash = hashSessionToken(token);
  const principal = await repository.findActive(tokenHash, now);
  if (principal === null) return null;
  if (principal.sessionCreatedAt === undefined) return null;
  const absoluteExpiresAt = new Date(
    principal.sessionCreatedAt.getTime() + maxSessionLifetimeSeconds * 1_000,
  );

  const material = createSessionMaterial(
    {
      accountId: principal.accountId,
      accountStatus: principal.accountStatus,
      sessionGeneration: principal.sessionGeneration,
      roles: principal.roles,
      scopes: principal.scopes,
      expiresInSeconds: input.expiresInSeconds,
      sessionCreatedAt: principal.sessionCreatedAt,
      absoluteExpiresAt,
      ...(input.tokenFactory === undefined
        ? {}
        : { tokenFactory: input.tokenFactory }),
      ...(input.sessionIdFactory === undefined
        ? {}
        : { sessionIdFactory: input.sessionIdFactory }),
    },
    now,
  );
  await repository.rotate(tokenHash, material.record, now);
  return createdSession(material, now);
}

export async function revokeSessionCookie(
  cookieHeader: string | undefined,
  repository: SessionRepositoryPort,
  now: Date = new Date(),
): Promise<void> {
  if (Number.isNaN(now.getTime())) return;
  const token = readCookieToken(cookieHeader);
  if (token === null) return;
  await repository.revoke(hashSessionToken(token), now);
}

export async function authenticateSessionCookie(
  cookieHeader: string | undefined,
  repository: SessionRepositoryPort,
  now: Date = new Date(),
): Promise<SessionPrincipal | null> {
  if (Number.isNaN(now.getTime())) return null;
  const token = readCookieToken(cookieHeader);
  if (token === null) return null;
  const principal = await repository.findActive(hashSessionToken(token), now);
  if (principal === null) return null;
  return Object.freeze({
    accountId: principal.accountId,
    accountStatus: principal.accountStatus,
    sessionGeneration: principal.sessionGeneration,
    roles: Object.freeze([...principal.roles]),
    scopes: Object.freeze([...principal.scopes]),
  });
}
