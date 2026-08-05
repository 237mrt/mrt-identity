import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type IdentityAdapter,
  type IdentitySession,
  type IdentityUser,
  type PasswordHasher,
  type TokenProvider,
} from "../src/index.ts";

describe("AuthManager logout işlemleri", () => {
  let user: IdentityUser;
  let sessions: IdentitySession[];

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

    sessions = [
      {
        id: "session-1",
        userId: user.id,
        refreshTokenHash: "refresh-token-hash-1",

        ipAddress: "127.0.0.1",
        userAgent: "Chrome",

        expiresAt: new Date(now.getTime() + 60_000),

        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
        revokedAt: null,
      },
      {
        id: "session-2",
        userId: user.id,
        refreshTokenHash: "refresh-token-hash-2",

        ipAddress: "192.168.1.10",
        userAgent: "Firefox",

        expiresAt: new Date(now.getTime() + 60_000),

        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
        revokedAt: null,
      },
    ];

    adapter = {
      name: "test",

      users: {
        create: vi.fn(),

        findById: vi.fn(async (id) => {
          return id === user.id ? user : null;
        }),

        findByEmail: vi.fn(async () => user),

        findByUsername: vi.fn(async () => user),

        update: vi.fn(async () => user),

        delete: vi.fn(async () => false),
      },

      sessions: {
        create: vi.fn(),

        findById: vi.fn(async (id) => {
          return sessions.find((session) => session.id === id) ?? null;
        }),

        findByRefreshTokenHash: vi.fn(async (tokenHash) => {
          return (
            sessions.find(
              (session) => session.refreshTokenHash === tokenHash,
            ) ?? null
          );
        }),

        listByUserId: vi.fn(async (userId) => {
          return sessions.filter((session) => session.userId === userId);
        }),

        update: vi.fn(async () => null),

        revoke: vi.fn(async (id, revokedAt = new Date()) => {
          const session = sessions.find((item) => item.id === id);

          if (!session) {
            return false;
          }

          session.revokedAt = revokedAt;

          session.updatedAt = revokedAt;

          return true;
        }),

        revokeAllByUserId: vi.fn(async (userId, revokedAt = new Date()) => {
          let revokedCount = 0;

          for (const session of sessions) {
            if (session.userId !== userId || session.revokedAt) {
              continue;
            }

            session.revokedAt = revokedAt;

            session.updatedAt = revokedAt;

            revokedCount += 1;
          }

          return revokedCount;
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
        token: "generated-token",
        tokenHash: "generated-token-hash",
      })),

      hash: vi.fn(async (token) => {
        if (token === "refresh-token-1") {
          return "refresh-token-hash-1";
        }

        if (token === "refresh-token-2") {
          return "refresh-token-hash-2";
        }

        return "unknown-token-hash";
      }),

      verify: vi.fn(async (token, tokenHash) => {
        return (
          (token === "refresh-token-1" &&
            tokenHash === "refresh-token-hash-1") ||
          (token === "refresh-token-2" && tokenHash === "refresh-token-hash-2")
        );
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

  it("refresh token ile sessionı iptal etmelidir", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.logout({
      refreshToken: "refresh-token-1",
    });

    expect(result.revoked).toBe(true);

    expect(sessions[0]?.revokedAt).toBeInstanceOf(Date);
  });

  it("geçersiz token için false döndürmelidir", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.logout({
      refreshToken: "invalid-token",
    });

    expect(result.revoked).toBe(false);
  });

  it("zaten iptal edilmiş session için false döndürmelidir", async () => {
    const firstSession = sessions[0];

    if (!firstSession) {
      throw new Error("Test sessionı bulunamadı.");
    }

    firstSession.revokedAt = new Date();

    const client = createClient();

    await client.start();

    const result = await client.auth.logout({
      refreshToken: "refresh-token-1",
    });

    expect(result.revoked).toBe(false);
  });

  it("kullanıcının bütün aktif sessionlarını iptal etmelidir", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.logoutAll({
      userId: "user-1",
    });

    expect(result.revokedCount).toBe(2);

    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it("bulunmayan kullanıcıyı reddetmelidir", async () => {
    const client = createClient();

    await client.start();

    await expect(
      client.auth.logoutAll({
        userId: "missing-user",
      }),
    ).rejects.toThrow("SESSION_USER_NOT_FOUND");
  });
});
