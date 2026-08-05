import { describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type CreateIdentitySessionInput,
  type IdentityAdapter,
  type IdentitySession,
  type IdentityUser,
  type PasswordHasher,
  type TokenProvider,
} from "../src/index.ts";

function createUser(): IdentityUser {
  const now = new Date();

  return {
    id: "user-1",
    email: "mert@example.com",
    username: "237mrt",
    passwordHash: "hashed:GucluParola123!",
    emailVerifiedAt: null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

describe("login session oluşturma", () => {
  it("session desteği varsa refresh token üretmelidir", async () => {
    const user = createUser();

    let storedSession: IdentitySession | null = null;

    const adapter: IdentityAdapter = {
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
        create: vi.fn(
          async (
            data: CreateIdentitySessionInput,
          ): Promise<IdentitySession> => {
            storedSession = {
              id: data.id,
              userId: data.userId,

              refreshTokenHash: data.refreshTokenHash,

              ipAddress: data.ipAddress ?? null,

              userAgent: data.userAgent ?? null,

              expiresAt: new Date(data.expiresAt),

              lastUsedAt: data.lastUsedAt ?? new Date(),

              createdAt: data.createdAt ?? new Date(),

              updatedAt: data.updatedAt ?? new Date(),

              revokedAt: data.revokedAt ?? null,
            };

            return storedSession;
          },
        ),

        findById: vi.fn(async () => storedSession),

        findByRefreshTokenHash: vi.fn(async () => null),

        listByUserId: vi.fn(async () => []),

        update: vi.fn(async () => null),

        revoke: vi.fn(async () => false),

        revokeAllByUserId: vi.fn(async () => 0),

        deleteExpired: vi.fn(async () => 0),
      },
    };

    const passwordHasher: PasswordHasher = {
      name: "test",

      hash: vi.fn(async (password) => `hashed:${password}`),

      verify: vi.fn(async (password, passwordHash) => {
        return passwordHash === `hashed:${password}`;
      }),

      needsRehash: vi.fn(async () => false),
    };

    const tokenProvider: TokenProvider = {
      name: "test-token",

      generate: vi.fn(async () => ({
        token: "plain-refresh-token",
        tokenHash: "hashed-refresh-token",
      })),

      hash: vi.fn(async (token) => `hashed:${token}`),

      verify: vi.fn(async () => true),
    };

    const client = new MRTIdentityClient({
      adapter,
      passwordHasher,
      tokenProvider,
      sessionDurationMs: 60_000,
      idGenerator: () => "session-1",
    });

    await client.start();

    const result = await client.auth.login({
      identifier: "mert@example.com",

      password: "GucluParola123!",

      context: {
        ipAddress: "127.0.0.1",
        userAgent: "Vitest",
      },
    });

    expect(result.refreshToken).toBe("plain-refresh-token");

    expect(result.session?.id).toBe("session-1");

    expect(result.session?.userId).toBe("user-1");

    expect(result.session?.ipAddress).toBe("127.0.0.1");

    expect("refreshTokenHash" in (result.session ?? {})).toBe(false);

    expect(storedSession?.refreshTokenHash).toBe("hashed-refresh-token");
  });
});
