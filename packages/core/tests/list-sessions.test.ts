import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type IdentityAdapter,
  type IdentitySession,
  type IdentityUser,
  type PasswordHasher,
} from "../src/index.ts";

describe("AuthManager.listSessions", () => {
  let user: IdentityUser;
  let sessions: IdentitySession[];

  let adapter: IdentityAdapter;
  let passwordHasher: PasswordHasher;

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
        id: "active-session",
        userId: user.id,

        refreshTokenHash: "active-token-hash",

        ipAddress: "127.0.0.1",
        userAgent: "Chrome",

        expiresAt: new Date(now.getTime() + 60_000),

        lastUsedAt: new Date(now.getTime() - 1_000),

        createdAt: now,
        updatedAt: now,
        revokedAt: null,
      },
      {
        id: "revoked-session",
        userId: user.id,

        refreshTokenHash: "revoked-token-hash",

        ipAddress: "192.168.1.10",
        userAgent: "Firefox",

        expiresAt: new Date(now.getTime() + 60_000),

        lastUsedAt: new Date(now.getTime() - 2_000),

        createdAt: now,
        updatedAt: now,
        revokedAt: new Date(),
      },
      {
        id: "expired-session",
        userId: user.id,

        refreshTokenHash: "expired-token-hash",

        ipAddress: "10.0.0.1",
        userAgent: "Mobile",

        expiresAt: new Date(now.getTime() - 60_000),

        lastUsedAt: new Date(now.getTime() - 3_000),

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

        findById: vi.fn(async () => null),

        findByRefreshTokenHash: vi.fn(async () => null),

        listByUserId: vi.fn(async (userId) => {
          return sessions.filter((session) => session.userId === userId);
        }),

        update: vi.fn(async () => null),

        revoke: vi.fn(async () => false),

        revokeAllByUserId: vi.fn(async () => 0),

        deleteExpired: vi.fn(async () => 0),
      },
    };

    passwordHasher = {
      name: "test",

      hash: vi.fn(async (value) => `hashed:${value}`),

      verify: vi.fn(async () => true),

      needsRehash: vi.fn(async () => false),
    };
  });

  function createClient() {
    return new MRTIdentityClient({
      adapter,
      passwordHasher,
    });
  }

  it("yalnızca aktif sessionları listelemelidir", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.listSessions({
      userId: "user-1",
    });

    expect(result.sessions).toHaveLength(1);

    expect(result.sessions[0]?.id).toBe("active-session");
  });

  it("istenirse iptal edilmiş sessionları da listelemelidir", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.listSessions({
      userId: "user-1",
      includeRevoked: true,
    });

    expect(result.sessions.map((session) => session.id)).toContain(
      "revoked-session",
    );

    expect(result.sessions.map((session) => session.id)).not.toContain(
      "expired-session",
    );
  });

  it("istenirse süresi dolmuş sessionları da listelemelidir", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.listSessions({
      userId: "user-1",
      includeExpired: true,
    });

    expect(result.sessions.map((session) => session.id)).toContain(
      "expired-session",
    );

    expect(result.sessions.map((session) => session.id)).not.toContain(
      "revoked-session",
    );
  });

  it("bütün filtreler açılırsa tüm sessionları listelemelidir", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.listSessions({
      userId: "user-1",
      includeRevoked: true,
      includeExpired: true,
    });

    expect(result.sessions).toHaveLength(3);
  });

  it("refresh token hash değerini dışarıya çıkarmamalıdır", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.listSessions({
      userId: "user-1",
    });

    const firstSession = result.sessions[0];

    expect(firstSession).toBeDefined();

    expect("refreshTokenHash" in (firstSession ?? {})).toBe(false);
  });

  it("bulunmayan kullanıcıyı reddetmelidir", async () => {
    const client = createClient();

    await client.start();

    await expect(
      client.auth.listSessions({
        userId: "missing-user",
      }),
    ).rejects.toThrow("SESSION_USER_NOT_FOUND");
  });
});
