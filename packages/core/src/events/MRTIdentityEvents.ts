import type { SessionContext } from "../auth/SessionAuthTypes.js";

import type { PublicIdentitySession } from "../types/PublicIdentitySession.js";

import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

export type LoginFailedReason =
  | "INVALID_CREDENTIALS"
  | "LOGIN_TEMPORARILY_BLOCKED"
  | "USER_ACCOUNT_LOCKED"
  | "USER_ACCOUNT_DISABLED";

export interface UserRegisteredEvent {
  user: PublicIdentityUser;
  occurredAt: Date;
}

export interface LoginSucceededEvent {
  user: PublicIdentityUser;
  session: PublicIdentitySession | null;
  context: SessionContext | null;
  occurredAt: Date;
}

export interface LoginFailedEvent {
  identifier: string;
  context: SessionContext | null;
  reason: LoginFailedReason;
  occurredAt: Date;
}

export interface SessionCreatedEvent {
  user: PublicIdentityUser;
  session: PublicIdentitySession;
  context: SessionContext | null;
  occurredAt: Date;
}

export interface SessionRefreshedEvent {
  user: PublicIdentityUser;
  session: PublicIdentitySession;
  context: SessionContext | null;
  occurredAt: Date;
}

export interface SessionRevokedEvent {
  sessionId: string;
  userId: string;
  reason: "logout" | "expired" | "account-state" | "user-not-found";

  occurredAt: Date;
}

export interface SessionsRevokedEvent {
  userId: string;
  revokedCount: number;
  reason: "logout-all";
  occurredAt: Date;
}

export interface MRTIdentityEventMap {
  userRegistered: UserRegisteredEvent;
  loginSucceeded: LoginSucceededEvent;
  loginFailed: LoginFailedEvent;
  sessionCreated: SessionCreatedEvent;
  sessionRefreshed: SessionRefreshedEvent;
  sessionRevoked: SessionRevokedEvent;
  sessionsRevoked: SessionsRevokedEvent;
}

export type MRTIdentityEventName = keyof MRTIdentityEventMap;

export type MRTIdentityEventListener<EventName extends MRTIdentityEventName> = (
  event: MRTIdentityEventMap[EventName],
) => void | Promise<void>;
