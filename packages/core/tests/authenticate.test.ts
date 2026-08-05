import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type AccessTokenProvider,
  type AccessTokenVerificationResult,
  type IdentityAdapter,
  type IdentitySession,
  type IdentityUser,
  type PasswordHasher,
} from "../src/index.ts";

describe("AuthManager.authenticate", () => {
  let user: IdentityUser;
  let session: IdentitySession;

  let adapter: IdentityAdapter;

  let passwordHasher: PasswordHasher;

  let accessTokenProvider: AccessTokenProvider;

  let verificationResult: AccessTokenVerificationResult;

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

      refreshTokenHash: "refresh-token-hash",

      ipAddress: "127.0.0.1",
      userAgent: "Vitest",

      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),

      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };

    verificationResult = {
      valid: true,

      payload: {
        userId: user.id,
        sessionId: session.id,

        issuedAt: new Date(now.getTime() - 60 * 1000),

        expiresAt: new Date(now.getTime() + 14 * 60 * 1000),
      },
    };

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
          return id === session.id ? session : null;
        }),

        findByRefreshTokenHash: vi.fn(async () => null),

        listByUserId: vi.fn(async () => [session]),

        update: vi.fn(async () => session),

        revoke: vi.fn(async (id, revokedAt) => {
          if (id !== session.id || session.revokedAt) {
            return false;
          }

          session = {
            ...session,
            revokedAt: new Date(revokedAt),
            updatedAt: new Date(revokedAt),
          };

          return true;
        }),

        revokeAllByUserId: vi.fn(async () => 1),

        deleteExpired: vi.fn(async () => 0),
      },
    };

    passwordHasher = {
      name: "test",

      hash: vi.fn(async (password) => `hashed:${password}`),

      verify: vi.fn(async () => true),

      needsRehash: vi.fn(async () => false),
    };

    accessTokenProvider = {
      create: vi.fn(async () => "access-token"),

      verify: vi.fn(async () => verificationResult),
    };
  });

  function createClient(): MRTIdentityClient {
    return new MRTIdentityClient({
      adapter,
      passwordHasher,
      accessTokenProvider,
    });
  }

  it("geçerli access tokenı doğrulamalıdır", async () => {
    const client = createClient();

    await client.start();

    const result = await client.auth.authenticate({
      accessToken: "valid-access-token",
    });

    expect(result.user.id).toBe("user-1");

    expect(result.session.id).toBe("session-1");

    expect(result.accessTokenExpiresAt).toEqual(expect.any(Date));

    expect("passwordHash" in result.user).toBe(false);

    expect("refreshTokenHash" in result.session).toBe(false);

    expect(accessTokenProvider.verify).toHaveBeenCalledWith({
      token: "valid-access-token",
    });
  });

  it("geçersiz access tokenı reddetmelidir", async () => {
    verificationResult = {
      valid: false,
      reason: "invalid",
    };

    const client = createClient();

    await client.start();

    await expect(
      client.auth.authenticate({
        accessToken: "invalid-token",
      }),
    ).rejects.toThrow("INVALID_ACCESS_TOKEN");
  });

  it("süresi dolmuş access tokenı reddetmelidir", async () => {
    verificationResult = {
      valid: false,
      reason: "expired",
    };

    const client = createClient();

    await client.start();

    await expect(
      client.auth.authenticate({
        accessToken: "expired-token",
      }),
    ).rejects.toThrow("ACCESS_TOKEN_EXPIRED");
  });

  it("iptal edilmiş sessionı reddetmelidir", async () => {
    session = {
      ...session,
      revokedAt: new Date(),
    };

    const client = createClient();

    await client.start();

    await expect(
      client.auth.authenticate({
        accessToken: "valid-access-token",
      }),
    ).rejects.toThrow("SESSION_REVOKED");
  });

  it("token ve session kullanıcıları eşleşmiyorsa reddetmelidir", async () => {
    if (!verificationResult.valid) {
      throw new Error("Test doğrulaması geçerli olmalıydı.");
    }

    verificationResult = {
      valid: true,

      payload: {
        ...verificationResult.payload,

        userId: "different-user",
      },
    };

    const client = createClient();

    await client.start();

    await expect(
      client.auth.authenticate({
        accessToken: "valid-access-token",
      }),
    ).rejects.toThrow("INVALID_ACCESS_TOKEN");
  });

  it("süresi dolmuş sessionı iptal etmelidir", async () => {
    session = {
      ...session,

      expiresAt: new Date(Date.now() - 1000),
    };

    const client = createClient();

    await client.start();

    await expect(
      client.auth.authenticate({
        accessToken: "valid-access-token",
      }),
    ).rejects.toThrow("SESSION_EXPIRED");

    expect(adapter.sessions?.revoke).toHaveBeenCalledWith(
      "session-1",
      expect.any(Date),
    );
  });

  it("devre dışı kullanıcıyı reddedip sessionı iptal etmelidir", async () => {
    user = {
      ...user,
      status: "disabled",
    };

    const client = createClient();

    await client.start();

    await expect(
      client.auth.authenticate({
        accessToken: "valid-access-token",
      }),
    ).rejects.toThrow("USER_ACCOUNT_DISABLED");

    expect(adapter.sessions?.revoke).toHaveBeenCalledWith(
      "session-1",
      expect.any(Date),
    );
  });
});
