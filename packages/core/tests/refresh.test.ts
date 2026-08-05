import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type IdentityAdapter,
  type IdentitySession,
  type IdentityUser,
  type PasswordHasher,
  type TokenProvider,
  type AccessTokenProvider,
  type CreateAccessTokenInput,
} from "../src/index.ts";

describe("AuthManager.refresh", () => {
  let user: IdentityUser;
  let session: IdentitySession;

  let adapter: IdentityAdapter;
  let passwordHasher: PasswordHasher;
  let tokenProvider: TokenProvider;

  let accessTokenProvider: AccessTokenProvider;

  let accessTokenInputs: CreateAccessTokenInput[];

  beforeEach(() => {
    const now = new Date();

    accessTokenInputs = [];

    accessTokenProvider = {
      create: async (input) => {
        accessTokenInputs.push(input);

        return "new-access-token";
      },

      verify: async () => ({
        valid: false,
        reason: "invalid",
      }),
    };

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
      userAgent: "Old Browser",

      expiresAt: new Date(now.getTime() + 60_000),

      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };

    adapter = {
      name: "test",

      users: {
        create: vi.fn(),

        findById: vi.fn(async () => user),

        findByEmail: vi.fn(async () => user),

        findByUsername: vi.fn(async () => user),

        update: vi.fn(async () => user),

        delete: vi.fn(async () => false),
      },

      sessions: {
        create: vi.fn(),

        findById: vi.fn(async () => session),

        findByRefreshTokenHash: vi.fn(async (tokenHash) => {
          return tokenHash === session.refreshTokenHash ? session : null;
        }),

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

        revoke: vi.fn(async () => true),

        revokeAllByUserId: vi.fn(async () => 1),

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

      hash: vi.fn(async (token) => {
        if (token === "old-refresh-token") {
          return "old-token-hash";
        }

        return "unknown-token-hash";
      }),

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
      accessTokenProvider,

      accessTokenDurationMs: 5 * 60 * 1000,
    });
  }

  it("refresh token rotation yapmalıdır", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.refresh({
      refreshToken: "old-refresh-token",

      context: {
        ipAddress: "192.168.1.10",
        userAgent: "New Browser",
      },
    });

    expect(result.accessToken).toBe("new-access-token");

    expect(result.accessTokenExpiresAt).toEqual(expect.any(Date));

    expect(accessTokenInputs).toHaveLength(1);

    const accessTokenInput = accessTokenInputs[0];

    expect(accessTokenInput).toBeDefined();

    expect(accessTokenInput).toEqual(
      expect.objectContaining({
        userId: "user-1",
        sessionId: "session-1",
        issuedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      }),
    );

    if (!accessTokenInput) {
      throw new Error("Access token girdisi oluşturulmalıydı.");
    }

    expect(
      accessTokenInput.expiresAt.getTime() -
        accessTokenInput.issuedAt.getTime(),
    ).toBe(5 * 60 * 1000);

    expect(result.refreshToken).toBe("new-refresh-token");

    expect(result.session.id).toBe("session-1");

    expect(result.session.ipAddress).toBe("192.168.1.10");

    expect(result.session.userAgent).toBe("New Browser");

    expect(session.refreshTokenHash).toBe("new-token-hash");

    expect("refreshTokenHash" in result.session).toBe(false);
  });

  it("geçersiz refresh tokeni reddetmelidir", async () => {
    const client = createClient();

    await client.start();

    await expect(
      client.auth.refresh({
        refreshToken: "invalid-refresh-token",
      }),
    ).rejects.toThrow("INVALID_REFRESH_TOKEN");
  });

  it("iptal edilmiş sessionı reddetmelidir", async () => {
    session = {
      ...session,
      revokedAt: new Date(),
    };

    const client = createClient();

    await client.start();

    await expect(
      client.auth.refresh({
        refreshToken: "old-refresh-token",
      }),
    ).rejects.toThrow("SESSION_REVOKED");
  });

  it("süresi dolmuş sessionı reddetmelidir", async () => {
    session = {
      ...session,

      expiresAt: new Date(Date.now() - 1_000),
    };

    const client = createClient();

    await client.start();

    await expect(
      client.auth.refresh({
        refreshToken: "old-refresh-token",
      }),
    ).rejects.toThrow("SESSION_EXPIRED");
  });

  it("kullanıcı bulunamazsa sessionı iptal etmelidir", async () => {
    vi.mocked(adapter.users.findById).mockResolvedValue(null);

    const client = createClient();

    await client.start();

    await expect(
      client.auth.refresh({
        refreshToken: "old-refresh-token",
      }),
    ).rejects.toThrow("SESSION_USER_NOT_FOUND");

    expect(adapter.sessions?.revoke).toHaveBeenCalledWith(
      "session-1",
      expect.any(Date),
    );
  });
});
