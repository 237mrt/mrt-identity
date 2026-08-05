import type { MRTIdentityClient } from "../client/MRTIdentityClient.js";

import { MRTIdentityError } from "../errors/MRTIdentityError.js";

import type { IdentityUser } from "../types/IdentityUser.js";

import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

import type { LoginInput, LoginResult } from "./LoginTypes.js";

import type { RegisterInput, RegisterResult } from "./RegisterTypes.js";

import type { IdentitySession } from "../types/IdentitySession.js";

import type { PublicIdentitySession } from "../types/PublicIdentitySession.js";

import type { RefreshInput, RefreshResult } from "./SessionAuthTypes.js";

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

export class AuthManager {
  private readonly client: MRTIdentityClient;

  public constructor(client: MRTIdentityClient) {
    this.client = client;
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

      return {
        user: toPublicIdentityUser(user),
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

    let user: IdentityUser | null;

    if (identifier.includes("@")) {
      user = await adapter.users.findByEmail(normalizeEmail(identifier));
    } else {
      user = await adapter.users.findByUsername(identifier);
    }

    if (!user) {
      throw new MRTIdentityError("INVALID_CREDENTIALS");
    }

    const passwordVerified = await passwordHasher.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordVerified) {
      throw new MRTIdentityError("INVALID_CREDENTIALS");
    }

    if (user.status === "locked") {
      throw new MRTIdentityError("USER_ACCOUNT_LOCKED");
    }

    if (user.status === "disabled") {
      throw new MRTIdentityError("USER_ACCOUNT_DISABLED");
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
      return {
        user: publicUser,
        passwordRehashed,
      };
    }

    const generatedToken = await tokenProvider.generate();

    const now = new Date();

    const session = await sessionAdapter.create({
      id: this.client.generateId(),
      userId: resolvedUser.id,

      refreshTokenHash: generatedToken.tokenHash,

      ipAddress: input.context?.ipAddress ?? null,

      userAgent: input.context?.userAgent ?? null,

      expiresAt: new Date(now.getTime() + this.client.sessionDurationMs),

      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      user: publicUser,
      passwordRehashed,
      session: toPublicIdentitySession(session),
      refreshToken: generatedToken.token,
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
      throw new MRTIdentityError("SESSION_EXPIRED");
    }

    const user = await adapter.users.findById(session.userId);

    if (!user) {
      await sessionAdapter.revoke(session.id, now);

      throw new MRTIdentityError("SESSION_USER_NOT_FOUND");
    }

    if (user.status === "locked") {
      await sessionAdapter.revoke(session.id, now);

      throw new MRTIdentityError("USER_ACCOUNT_LOCKED");
    }

    if (user.status === "disabled") {
      await sessionAdapter.revoke(session.id, now);

      throw new MRTIdentityError("USER_ACCOUNT_DISABLED");
    }

    const generatedToken = await tokenProvider.generate();

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

    return {
      user: toPublicIdentityUser(user),

      session: toPublicIdentitySession(updatedSession),

      refreshToken: generatedToken.token,
    };
  }
}
