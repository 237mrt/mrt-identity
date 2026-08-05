import { createHash } from "node:crypto";

import type { MRTIdentityClient } from "../client/MRTIdentityClient.js";

import { MRTIdentityError } from "../errors/MRTIdentityError.js";

import type { IdentityUser } from "../types/IdentityUser.js";

import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

import type { LoginInput, LoginResult } from "./LoginTypes.js";

import type { RegisterInput, RegisterResult } from "./RegisterTypes.js";

import type { IdentitySession } from "../types/IdentitySession.js";

import type { PublicIdentitySession } from "../types/PublicIdentitySession.js";

import type { LoginFailedReason } from "../events/MRTIdentityEvents.js";

import type {
  AuthenticateInput,
  AuthenticateResult,
} from "./AuthenticateTypes.js";

import type {
  ListSessionsInput,
  ListSessionsResult,
  LogoutAllInput,
  LogoutAllResult,
  LogoutInput,
  LogoutResult,
  RefreshInput,
  RefreshResult,
} from "./SessionAuthTypes.js";

import type { IdentityLoginAttemptAdapter } from "../adapters/IdentityLoginAttemptAdapter.js";

import type { IdentityLoginAttemptScope } from "../types/IdentityLoginAttempt.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string | null | undefined): string | null {
  const normalizedUsername = username?.trim();

  return normalizedUsername || null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 32 && !/\s/.test(username);
}

function toPublicIdentityUser(user: IdentityUser): PublicIdentityUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;

  return {
    ...publicUser,

    emailVerifiedAt: publicUser.emailVerifiedAt
      ? new Date(publicUser.emailVerifiedAt)
      : null,

    createdAt: new Date(publicUser.createdAt),
    updatedAt: new Date(publicUser.updatedAt),
  };
}

function toPublicIdentitySession(
  session: IdentitySession,
): PublicIdentitySession {
  const { refreshTokenHash: _refreshTokenHash, ...publicSession } = session;

  return {
    ...publicSession,
    expiresAt: new Date(publicSession.expiresAt),
    lastUsedAt: new Date(publicSession.lastUsedAt),
    createdAt: new Date(publicSession.createdAt),
    updatedAt: new Date(publicSession.updatedAt),

    revokedAt: publicSession.revokedAt
      ? new Date(publicSession.revokedAt)
      : null,
  };
}

function convertAdapterError(error: unknown): never {
  if (error instanceof MRTIdentityError) {
    throw error;
  }

  if (error instanceof Error) {
    if (error.message === "USER_EMAIL_ALREADY_EXISTS") {
      throw new MRTIdentityError("USER_EMAIL_ALREADY_EXISTS");
    }

    if (error.message === "USER_USERNAME_ALREADY_EXISTS") {
      throw new MRTIdentityError("USER_USERNAME_ALREADY_EXISTS");
    }
  }

  throw error;
}

interface LoginAttemptKey {
  key: string;
  scope: IdentityLoginAttemptScope;
}

interface IssuedAccessToken {
  accessToken: string;
  accessTokenExpiresAt: Date;
}

function normalizeLoginIdentifier(identifier: string): string {
  const normalizedIdentifier = identifier.trim();

  if (normalizedIdentifier.includes("@")) {
    return normalizeEmail(normalizedIdentifier);
  }

  return normalizedIdentifier.toLowerCase();
}

function hashLoginAttemptValue(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function createLoginAttemptKeys(
  identifier: string,
  ipAddress: string | null | undefined,
  trackByIp: boolean,
): LoginAttemptKey[] {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  const keys: LoginAttemptKey[] = [
    {
      scope: "identifier",

      key: hashLoginAttemptValue(`identifier:${normalizedIdentifier}`),
    },
  ];

  const normalizedIpAddress = ipAddress?.trim();

  if (trackByIp && normalizedIpAddress) {
    keys.push({
      scope: "identifier-ip",

      key: hashLoginAttemptValue(
        `identifier-ip:${normalizedIdentifier}:${normalizedIpAddress}`,
      ),
    });
  }

  return keys;
}

export class AuthManager {
  private readonly client: MRTIdentityClient;

  public constructor(client: MRTIdentityClient) {
    this.client = client;
  }

  private async issueAccessToken(
    userId: string,
    sessionId: string,
    issuedAt: Date,
  ): Promise<IssuedAccessToken | null> {
    const accessTokenProvider = this.client.accessTokenProvider;

    if (!accessTokenProvider) {
      return null;
    }

    const accessTokenExpiresAt = new Date(
      issuedAt.getTime() + this.client.accessTokenDurationMs,
    );

    const accessToken = await accessTokenProvider.create({
      userId,
      sessionId,

      issuedAt: new Date(issuedAt.getTime()),

      expiresAt: new Date(accessTokenExpiresAt.getTime()),
    });

    return {
      accessToken,
      accessTokenExpiresAt,
    };
  }

  private async emitLoginFailed(
    input: LoginInput,
    reason: LoginFailedReason,
  ): Promise<void> {
    await this.client.emitEvent("loginFailed", {
      identifier: input.identifier.trim(),

      context: input.context ?? null,

      reason,
      occurredAt: new Date(),
    });
  }

  private async assertLoginNotBlocked(
    loginAttempts: IdentityLoginAttemptAdapter,
    keys: LoginAttemptKey[],
    now: Date,
  ): Promise<void> {
    for (const item of keys) {
      const attempt = await loginAttempts.findByKey(item.key);

      if (
        attempt?.lockedUntil &&
        attempt.lockedUntil.getTime() > now.getTime()
      ) {
        throw new MRTIdentityError("LOGIN_TEMPORARILY_BLOCKED");
      }
    }
  }

  private async recordLoginFailure(
    loginAttempts: IdentityLoginAttemptAdapter,
    keys: LoginAttemptKey[],
    occurredAt: Date,
  ): Promise<void> {
    let temporarilyBlocked = false;

    for (const item of keys) {
      const attempt = await loginAttempts.recordFailure({
        key: item.key,
        scope: item.scope,
        occurredAt,

        maxAttempts: this.client.loginProtection.maxAttempts,

        attemptWindowMs: this.client.loginProtection.attemptWindowMs,

        lockDurationMs: this.client.loginProtection.lockDurationMs,
      });

      if (
        attempt.lockedUntil &&
        attempt.lockedUntil.getTime() > occurredAt.getTime()
      ) {
        temporarilyBlocked = true;
      }
    }

    if (temporarilyBlocked) {
      throw new MRTIdentityError("LOGIN_TEMPORARILY_BLOCKED");
    }
  }

  private async clearLoginFailures(
    loginAttempts: IdentityLoginAttemptAdapter,
    keys: LoginAttemptKey[],
  ): Promise<void> {
    await Promise.all(keys.map((item) => loginAttempts.clear(item.key)));
  }

  public async register(input: RegisterInput): Promise<RegisterResult> {
    this.client.assertReady();

    const adapter = this.client.adapter;
    const passwordHasher = this.client.passwordHasher;

    if (!adapter || !passwordHasher) {
      throw new MRTIdentityError("CLIENT_NOT_READY");
    }

    const email = normalizeEmail(input.email);

    if (!isValidEmail(email)) {
      throw new MRTIdentityError("INVALID_EMAIL");
    }

    const username = normalizeUsername(input.username);

    if (username && !isValidUsername(username)) {
      throw new MRTIdentityError("INVALID_USERNAME");
    }

    const passwordValidation = await this.client.passwordPolicy.validate(
      input.password,
    );

    if (!passwordValidation.valid) {
      throw new MRTIdentityError(
        "WEAK_PASSWORD",
        passwordValidation.issues.join(","),
      );
    }

    const existingEmail = await adapter.users.findByEmail(email);

    if (existingEmail) {
      throw new MRTIdentityError("USER_EMAIL_ALREADY_EXISTS");
    }

    if (username) {
      const existingUsername = await adapter.users.findByUsername(username);

      if (existingUsername) {
        throw new MRTIdentityError("USER_USERNAME_ALREADY_EXISTS");
      }
    }

    const passwordHash = await passwordHasher.hash(input.password);

    const id = this.client.generateId();

    try {
      const user = await adapter.users.create({
        id,
        email,
        username,
        passwordHash,
        status: "active",
      });

      const publicUser = toPublicIdentityUser(user);

      await this.client.emitEvent("userRegistered", {
        user: publicUser,
        occurredAt: new Date(),
      });

      return {
        user: publicUser,
      };
    } catch (error) {
      return convertAdapterError(error);
    }
  }

  public async login(input: LoginInput): Promise<LoginResult> {
    this.client.assertReady();

    const adapter = this.client.adapter;
    const passwordHasher = this.client.passwordHasher;

    if (!adapter || !passwordHasher) {
      throw new MRTIdentityError("CLIENT_NOT_READY");
    }

    const identifier = input.identifier.trim();

    if (!identifier || !input.password) {
      throw new MRTIdentityError("INVALID_CREDENTIALS");
    }

    const loginAttempts = adapter.loginAttempts;

    const loginProtectionEnabled =
      this.client.loginProtection.enabled && loginAttempts !== undefined;

    const loginAttemptKeys = loginProtectionEnabled
      ? createLoginAttemptKeys(
          input.identifier,
          input.context?.ipAddress,
          this.client.loginProtection.trackByIp,
        )
      : [];

    const loginAttemptTime = new Date();

    if (loginProtectionEnabled && loginAttempts) {
      try {
        await this.assertLoginNotBlocked(
          loginAttempts,
          loginAttemptKeys,
          loginAttemptTime,
        );
      } catch (error) {
        if (
          error instanceof MRTIdentityError &&
          error.code === "LOGIN_TEMPORARILY_BLOCKED"
        ) {
          await this.emitLoginFailed(input, "LOGIN_TEMPORARILY_BLOCKED");
        }

        throw error;
      }
    }

    let user: IdentityUser | null;

    if (identifier.includes("@")) {
      user = await adapter.users.findByEmail(normalizeEmail(identifier));
    } else {
      user = await adapter.users.findByUsername(identifier);
    }

    if (!user) {
      if (loginProtectionEnabled && loginAttempts) {
        try {
          await this.recordLoginFailure(
            loginAttempts,
            loginAttemptKeys,
            new Date(),
          );
        } catch (error) {
          if (
            error instanceof MRTIdentityError &&
            error.code === "LOGIN_TEMPORARILY_BLOCKED"
          ) {
            await this.emitLoginFailed(input, "LOGIN_TEMPORARILY_BLOCKED");
          }

          throw error;
        }
      }

      await this.emitLoginFailed(input, "INVALID_CREDENTIALS");

      throw new MRTIdentityError("INVALID_CREDENTIALS");
    }

    const passwordVerified = await passwordHasher.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordVerified) {
      if (loginProtectionEnabled && loginAttempts) {
        try {
          await this.recordLoginFailure(
            loginAttempts,
            loginAttemptKeys,
            new Date(),
          );
        } catch (error) {
          if (
            error instanceof MRTIdentityError &&
            error.code === "LOGIN_TEMPORARILY_BLOCKED"
          ) {
            await this.emitLoginFailed(input, "LOGIN_TEMPORARILY_BLOCKED");
          }

          throw error;
        }
      }

      await this.emitLoginFailed(input, "INVALID_CREDENTIALS");

      throw new MRTIdentityError("INVALID_CREDENTIALS");
    }

    if (user.status === "locked") {
      await this.emitLoginFailed(input, "USER_ACCOUNT_LOCKED");

      throw new MRTIdentityError("USER_ACCOUNT_LOCKED");
    }

    if (user.status === "disabled") {
      await this.emitLoginFailed(input, "USER_ACCOUNT_DISABLED");

      throw new MRTIdentityError("USER_ACCOUNT_DISABLED");
    }

    if (loginProtectionEnabled && loginAttempts) {
      await this.clearLoginFailures(loginAttempts, loginAttemptKeys);
    }

    let resolvedUser = user;
    let passwordRehashed = false;

    if (passwordHasher.needsRehash) {
      const needsRehash = await passwordHasher.needsRehash(user.passwordHash);

      if (needsRehash) {
        const newPasswordHash = await passwordHasher.hash(input.password);

        const updatedUser = await adapter.users.update(user.id, {
          passwordHash: newPasswordHash,
        });

        if (updatedUser) {
          resolvedUser = updatedUser;
          passwordRehashed = true;
        }
      }
    }

    const publicUser = toPublicIdentityUser(resolvedUser);

    const sessionAdapter = adapter.sessions;

    const tokenProvider = this.client.tokenProvider;

    if (!sessionAdapter || !tokenProvider) {
      await this.client.emitEvent("loginSucceeded", {
        user: publicUser,
        session: null,

        context: input.context ?? null,

        occurredAt: new Date(),
      });

      return {
        user: publicUser,
        passwordRehashed,
      };
    }

    const generatedToken = await tokenProvider.generate();

    const now = new Date();

    const sessionId = this.client.generateId();

    const issuedAccessToken = await this.issueAccessToken(
      resolvedUser.id,
      sessionId,
      now,
    );

    const session = await sessionAdapter.create({
      id: sessionId,
      userId: resolvedUser.id,

      refreshTokenHash: generatedToken.tokenHash,

      ipAddress: input.context?.ipAddress ?? null,

      userAgent: input.context?.userAgent ?? null,

      expiresAt: new Date(now.getTime() + this.client.sessionDurationMs),

      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const publicSession = toPublicIdentitySession(session);

    const eventContext = input.context ?? null;

    await this.client.emitEvent("sessionCreated", {
      user: publicUser,
      session: publicSession,
      context: eventContext,
      occurredAt: new Date(),
    });

    await this.client.emitEvent("loginSucceeded", {
      user: publicUser,
      session: publicSession,
      context: eventContext,
      occurredAt: new Date(),
    });

    return {
      user: publicUser,
      passwordRehashed,
      session: publicSession,

      refreshToken: generatedToken.token,

      ...(issuedAccessToken ? issuedAccessToken : {}),
    };
  }

  public async refresh(input: RefreshInput): Promise<RefreshResult> {
    this.client.assertReady();

    const adapter = this.client.adapter;

    if (!adapter) {
      throw new MRTIdentityError("ADAPTER_NOT_CONFIGURED");
    }

    const sessionAdapter = adapter.sessions;

    if (!sessionAdapter) {
      throw new MRTIdentityError("SESSION_SUPPORT_NOT_CONFIGURED");
    }

    const tokenProvider = this.client.tokenProvider;

    if (!tokenProvider) {
      throw new MRTIdentityError("TOKEN_PROVIDER_NOT_CONFIGURED");
    }

    if (
      typeof input.refreshToken !== "string" ||
      input.refreshToken.length === 0
    ) {
      throw new MRTIdentityError("INVALID_REFRESH_TOKEN");
    }

    const refreshTokenHash = await tokenProvider.hash(input.refreshToken);

    const session =
      await sessionAdapter.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      throw new MRTIdentityError("INVALID_REFRESH_TOKEN");
    }

    const tokenVerified = await tokenProvider.verify(
      input.refreshToken,
      session.refreshTokenHash,
    );

    if (!tokenVerified) {
      throw new MRTIdentityError("INVALID_REFRESH_TOKEN");
    }

    if (session.revokedAt) {
      throw new MRTIdentityError("SESSION_REVOKED");
    }

    const now = new Date();

    if (session.expiresAt.getTime() <= now.getTime()) {
      const revoked = await sessionAdapter.revoke(session.id, now);

      if (revoked) {
        await this.client.emitEvent("sessionRevoked", {
          sessionId: session.id,
          userId: session.userId,
          reason: "expired",
          occurredAt: now,
        });
      }

      throw new MRTIdentityError("SESSION_EXPIRED");
    }

    const user = await adapter.users.findById(session.userId);

    if (!user) {
      const revoked = await sessionAdapter.revoke(session.id, now);

      if (revoked) {
        await this.client.emitEvent("sessionRevoked", {
          sessionId: session.id,
          userId: session.userId,
          reason: "user-not-found",
          occurredAt: now,
        });
      }

      throw new MRTIdentityError("SESSION_USER_NOT_FOUND");
    }

    if (user.status === "locked") {
      const revoked = await sessionAdapter.revoke(session.id, now);

      if (revoked) {
        await this.client.emitEvent("sessionRevoked", {
          sessionId: session.id,
          userId: session.userId,
          reason: "account-state",
          occurredAt: now,
        });
      }

      throw new MRTIdentityError("USER_ACCOUNT_LOCKED");
    }

    if (user.status === "disabled") {
      const revoked = await sessionAdapter.revoke(session.id, now);

      if (revoked) {
        await this.client.emitEvent("sessionRevoked", {
          sessionId: session.id,
          userId: session.userId,
          reason: "account-state",
          occurredAt: now,
        });
      }

      throw new MRTIdentityError("USER_ACCOUNT_DISABLED");
    }

    const generatedToken = await tokenProvider.generate();

    const issuedAccessToken = await this.issueAccessToken(
      user.id,
      session.id,
      now,
    );

    const updatedSession = await sessionAdapter.update(session.id, {
      refreshTokenHash: generatedToken.tokenHash,

      ipAddress:
        input.context?.ipAddress !== undefined
          ? input.context.ipAddress
          : session.ipAddress,

      userAgent:
        input.context?.userAgent !== undefined
          ? input.context.userAgent
          : session.userAgent,

      lastUsedAt: now,
      updatedAt: now,
    });

    if (!updatedSession) {
      throw new MRTIdentityError("INVALID_REFRESH_TOKEN");
    }

    const publicUser = toPublicIdentityUser(user);

    const publicSession = toPublicIdentitySession(updatedSession);

    await this.client.emitEvent("sessionRefreshed", {
      user: publicUser,
      session: publicSession,

      context: input.context ?? null,

      occurredAt: new Date(),
    });

    return {
      user: publicUser,
      session: publicSession,

      refreshToken: generatedToken.token,

      ...(issuedAccessToken ? issuedAccessToken : {}),
    };
  }

  public async authenticate(
    input: AuthenticateInput,
  ): Promise<AuthenticateResult> {
    this.client.assertReady();

    const adapter = this.client.adapter;

    if (!adapter) {
      throw new MRTIdentityError("ADAPTER_NOT_CONFIGURED");
    }

    const sessionAdapter = adapter.sessions;

    if (!sessionAdapter) {
      throw new MRTIdentityError("SESSION_SUPPORT_NOT_CONFIGURED");
    }

    const accessTokenProvider = this.client.accessTokenProvider;

    if (!accessTokenProvider) {
      throw new MRTIdentityError("ACCESS_TOKEN_PROVIDER_NOT_CONFIGURED");
    }

    if (
      typeof input.accessToken !== "string" ||
      input.accessToken.trim().length === 0
    ) {
      throw new MRTIdentityError("INVALID_ACCESS_TOKEN");
    }

    const verification = await accessTokenProvider.verify({
      token: input.accessToken,
    });

    if (!verification.valid) {
      if (verification.reason === "expired") {
        throw new MRTIdentityError("ACCESS_TOKEN_EXPIRED");
      }

      throw new MRTIdentityError("INVALID_ACCESS_TOKEN");
    }

    const { payload } = verification;

    if (
      typeof payload.userId !== "string" ||
      payload.userId.trim().length === 0 ||
      typeof payload.sessionId !== "string" ||
      payload.sessionId.trim().length === 0
    ) {
      throw new MRTIdentityError("INVALID_ACCESS_TOKEN");
    }

    if (
      !(payload.expiresAt instanceof Date) ||
      Number.isNaN(payload.expiresAt.getTime())
    ) {
      throw new MRTIdentityError("INVALID_ACCESS_TOKEN");
    }

    const now = new Date();

    if (payload.expiresAt.getTime() <= now.getTime()) {
      throw new MRTIdentityError("ACCESS_TOKEN_EXPIRED");
    }

    const session = await sessionAdapter.findById(payload.sessionId);

    /*
     * Tokenın sessionı bulunamazsa veya
     * token userId ile session userId
     * eşleşmiyorsa detay sızdırmadan
     * tokenı geçersiz kabul ederiz.
     */
    if (!session || session.userId !== payload.userId) {
      throw new MRTIdentityError("INVALID_ACCESS_TOKEN");
    }

    if (session.revokedAt) {
      throw new MRTIdentityError("SESSION_REVOKED");
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      const revoked = await sessionAdapter.revoke(session.id, now);

      if (revoked) {
        await this.client.emitEvent("sessionRevoked", {
          sessionId: session.id,
          userId: session.userId,
          reason: "expired",
          occurredAt: now,
        });
      }

      throw new MRTIdentityError("SESSION_EXPIRED");
    }

    const user = await adapter.users.findById(session.userId);

    if (!user) {
      const revoked = await sessionAdapter.revoke(session.id, now);

      if (revoked) {
        await this.client.emitEvent("sessionRevoked", {
          sessionId: session.id,
          userId: session.userId,
          reason: "user-not-found",
          occurredAt: now,
        });
      }

      throw new MRTIdentityError("SESSION_USER_NOT_FOUND");
    }

    if (user.status === "locked") {
      const revoked = await sessionAdapter.revoke(session.id, now);

      if (revoked) {
        await this.client.emitEvent("sessionRevoked", {
          sessionId: session.id,
          userId: session.userId,
          reason: "account-state",
          occurredAt: now,
        });
      }

      throw new MRTIdentityError("USER_ACCOUNT_LOCKED");
    }

    if (user.status === "disabled") {
      const revoked = await sessionAdapter.revoke(session.id, now);

      if (revoked) {
        await this.client.emitEvent("sessionRevoked", {
          sessionId: session.id,
          userId: session.userId,
          reason: "account-state",
          occurredAt: now,
        });
      }

      throw new MRTIdentityError("USER_ACCOUNT_DISABLED");
    }

    return {
      user: toPublicIdentityUser(user),

      session: toPublicIdentitySession(session),

      accessTokenExpiresAt: new Date(payload.expiresAt.getTime()),
    };
  }

  public async logout(input: LogoutInput): Promise<LogoutResult> {
    this.client.assertReady();

    const adapter = this.client.adapter;

    if (!adapter) {
      throw new MRTIdentityError("ADAPTER_NOT_CONFIGURED");
    }

    const sessionAdapter = adapter.sessions;

    if (!sessionAdapter) {
      throw new MRTIdentityError("SESSION_SUPPORT_NOT_CONFIGURED");
    }

    const tokenProvider = this.client.tokenProvider;

    if (!tokenProvider) {
      throw new MRTIdentityError("TOKEN_PROVIDER_NOT_CONFIGURED");
    }

    if (
      typeof input.refreshToken !== "string" ||
      input.refreshToken.length === 0
    ) {
      return {
        revoked: false,
      };
    }

    const refreshTokenHash = await tokenProvider.hash(input.refreshToken);

    const session =
      await sessionAdapter.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      return {
        revoked: false,
      };
    }

    const tokenVerified = await tokenProvider.verify(
      input.refreshToken,
      session.refreshTokenHash,
    );

    if (!tokenVerified) {
      return {
        revoked: false,
      };
    }

    if (session.revokedAt) {
      return {
        revoked: false,
      };
    }

    const revokedAt = new Date();

    const revoked = await sessionAdapter.revoke(session.id, revokedAt);

    if (revoked) {
      await this.client.emitEvent("sessionRevoked", {
        sessionId: session.id,
        userId: session.userId,
        reason: "logout",
        occurredAt: revokedAt,
      });
    }

    return {
      revoked,
    };
  }

  public async logoutAll(input: LogoutAllInput): Promise<LogoutAllResult> {
    this.client.assertReady();

    const adapter = this.client.adapter;

    if (!adapter) {
      throw new MRTIdentityError("ADAPTER_NOT_CONFIGURED");
    }

    const sessionAdapter = adapter.sessions;

    if (!sessionAdapter) {
      throw new MRTIdentityError("SESSION_SUPPORT_NOT_CONFIGURED");
    }

    if (typeof input.userId !== "string" || input.userId.trim().length === 0) {
      throw new MRTIdentityError("SESSION_USER_NOT_FOUND");
    }

    const user = await adapter.users.findById(input.userId);

    if (!user) {
      throw new MRTIdentityError("SESSION_USER_NOT_FOUND");
    }

    const occurredAt = new Date();

    const revokedCount = await sessionAdapter.revokeAllByUserId(
      user.id,
      occurredAt,
    );

    await this.client.emitEvent("sessionsRevoked", {
      userId: user.id,
      revokedCount,
      reason: "logout-all",
      occurredAt,
    });

    return {
      revokedCount,
    };
  }

  public async listSessions(
    input: ListSessionsInput,
  ): Promise<ListSessionsResult> {
    this.client.assertReady();

    const adapter = this.client.adapter;

    if (!adapter) {
      throw new MRTIdentityError("ADAPTER_NOT_CONFIGURED");
    }

    const sessionAdapter = adapter.sessions;

    if (!sessionAdapter) {
      throw new MRTIdentityError("SESSION_SUPPORT_NOT_CONFIGURED");
    }

    if (typeof input.userId !== "string" || input.userId.trim().length === 0) {
      throw new MRTIdentityError("SESSION_USER_NOT_FOUND");
    }

    const userId = input.userId.trim();

    const user = await adapter.users.findById(userId);

    if (!user) {
      throw new MRTIdentityError("SESSION_USER_NOT_FOUND");
    }

    const sessions = await sessionAdapter.listByUserId(user.id);

    const now = Date.now();

    const publicSessions = sessions
      .filter((session) => {
        if (!input.includeRevoked && session.revokedAt) {
          return false;
        }

        if (!input.includeExpired && session.expiresAt.getTime() <= now) {
          return false;
        }

        return true;
      })
      .sort(
        (first, second) =>
          second.lastUsedAt.getTime() - first.lastUsedAt.getTime(),
      )
      .map(toPublicIdentitySession);

    return {
      sessions: publicSessions,
    };
  }
}
