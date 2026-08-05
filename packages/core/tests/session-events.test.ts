import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type IdentityAdapter,
  type IdentitySession,
  type IdentityUser,
  type PasswordHasher,
  type TokenProvider,
} from "../src/index.ts";

describe("AuthManager session eventleri", () => {
  let user: IdentityUser;
  let session: IdentitySession;

  let adapter: IdentityAdapter;
  let passwordHasher: PasswordHasher;
  let tokenProvider: TokenProvider;

  beforeEach(() => {
    const now = new Date();

    user = {
      id: "user-1",
      email: "mert@example.com",
      username: "237mrt",
      passwordHash: "hashed-password",
      emailVerifiedAt: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    session = {
      id: "session-1",
      userId: user.id,
      refreshTokenHash: "old-token-hash",

      ipAddress: "127.0.0.1",
      userAgent: "Chrome",

      expiresAt: new Date(now.getTime() + 60_000),

      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };

    adapter = {
      name: "session-event-test",

      users: {
        create: vi.fn(),

        findById: vi.fn(async (id) => (id === user.id ? user : null)),

        findByEmail: vi.fn(async () => user),

        findByUsername: vi.fn(async () => user),

        update: vi.fn(async () => user),

        delete: vi.fn(async () => false),
      },

      sessions: {
        create: vi.fn(),

        findById: vi.fn(async (id) => (id === session.id ? session : null)),

        findByRefreshTokenHash: vi.fn(async (tokenHash) =>
          tokenHash === session.refreshTokenHash ? session : null,
        ),

        listByUserId: vi.fn(async () => [session]),

        update: vi.fn(async (id, data) => {
          if (id !== session.id) {
            return null;
          }

          session = {
            ...session,
            ...data,
            updatedAt: data.updatedAt ?? new Date(),
          };

          return session;
        }),

        revoke: vi.fn(async (id, revokedAt = new Date()) => {
          if (id !== session.id) {
            return false;
          }

          session = {
            ...session,
            revokedAt,
            updatedAt: revokedAt,
          };

          return true;
        }),

        revokeAllByUserId: vi.fn(async (userId, revokedAt = new Date()) => {
          if (userId !== user.id || session.revokedAt) {
            return 0;
          }

          session = {
            ...session,
            revokedAt,
            updatedAt: revokedAt,
          };

          return 1;
        }),

        deleteExpired: vi.fn(async () => 0),
      },
    };

    passwordHasher = {
      name: "test",

      hash: vi.fn(async (value) => `hashed:${value}`),

      verify: vi.fn(async () => true),

      needsRehash: vi.fn(async () => false),
    };

    tokenProvider = {
      name: "test-token",

      generate: vi.fn(async () => ({
        token: "new-refresh-token",
        tokenHash: "new-token-hash",
      })),

      hash: vi.fn(async (token) =>
        token === "old-refresh-token" ? "old-token-hash" : "invalid-token-hash",
      ),

      verify: vi.fn(async (token, tokenHash) => {
        return token === "old-refresh-token" && tokenHash === "old-token-hash";
      }),
    };
  });

  function createClient() {
    return new MRTIdentityClient({
      adapter,
      passwordHasher,
      tokenProvider,
    });
  }

  it("refresh işleminde sessionRefreshed yayınlamalıdır", async () => {
    const client = createClient();
    const listener = vi.fn();

    client.on("sessionRefreshed", listener);

    await client.start();

    await client.auth.refresh({
      refreshToken: "old-refresh-token",

      context: {
        ipAddress: "192.168.1.10",
        userAgent: "Firefox",
      },
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user-1",
        }),

        session: expect.objectContaining({
          id: "session-1",
          ipAddress: "192.168.1.10",
          userAgent: "Firefox",
        }),

        occurredAt: expect.any(Date),
      }),
    );
  });

  it("logout işleminde sessionRevoked yayınlamalıdır", async () => {
    const client = createClient();
    const listener = vi.fn();

    client.on("sessionRevoked", listener);

    await client.start();

    await client.auth.logout({
      refreshToken: "old-refresh-token",
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        userId: "user-1",
        reason: "logout",
        occurredAt: expect.any(Date),
      }),
    );
  });

  it("logoutAll işleminde sessionsRevoked yayınlamalıdır", async () => {
    const client = createClient();
    const listener = vi.fn();

    client.on("sessionsRevoked", listener);

    await client.start();

    await client.auth.logoutAll({
      userId: "user-1",
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        revokedCount: 1,
        reason: "logout-all",
        occurredAt: expect.any(Date),
      }),
    );
  });

  it("süresi dolmuş sessionı iptal edip event yayınlamalıdır", async () => {
    session = {
      ...session,
      expiresAt: new Date(Date.now() - 1_000),
    };

    const client = createClient();
    const listener = vi.fn();

    client.on("sessionRevoked", listener);

    await client.start();

    await expect(
      client.auth.refresh({
        refreshToken: "old-refresh-token",
      }),
    ).rejects.toThrow("SESSION_EXPIRED");

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        userId: "user-1",
        reason: "expired",
      }),
    );
  });
});
