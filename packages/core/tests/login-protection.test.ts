import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type IdentityAdapter,
  type IdentityLoginAttempt,
  type IdentityUser,
  type PasswordHasher,
} from "../src/index.ts";

describe("AuthManager login koruması", () => {
  let user: IdentityUser;
  let attempts: Map<string, IdentityLoginAttempt>;

  let adapter: IdentityAdapter;
  let passwordHasher: PasswordHasher;

  beforeEach(() => {
    const now = new Date();

    attempts = new Map();

    user = {
      id: "user-1",
      email: "mert@example.com",
      username: "237mrt",
      passwordHash: "hashed:GucluParola123!",
      emailVerifiedAt: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    adapter = {
      name: "test",

      users: {
        create: vi.fn(),

        findById: vi.fn(async () => user),

        findByEmail: vi.fn(async (email) => {
          return email === user.email ? user : null;
        }),

        findByUsername: vi.fn(async (username) => {
          return username === user.username ? user : null;
        }),

        update: vi.fn(async () => user),

        delete: vi.fn(async () => false),
      },

      loginAttempts: {
        findByKey: vi.fn(async (key) => {
          return attempts.get(key) ?? null;
        }),

        recordFailure: vi.fn(async (input) => {
          const existing = attempts.get(input.key);

          const failedAttempts = (existing?.failedAttempts ?? 0) + 1;

          const lockedUntil =
            failedAttempts >= input.maxAttempts
              ? new Date(input.occurredAt.getTime() + input.lockDurationMs)
              : null;

          const attempt: IdentityLoginAttempt = {
            key: input.key,
            scope: input.scope,
            failedAttempts,

            firstFailedAt: existing?.firstFailedAt ?? input.occurredAt,

            lastFailedAt: input.occurredAt,

            lockedUntil,

            createdAt: existing?.createdAt ?? input.occurredAt,

            updatedAt: input.occurredAt,
          };

          attempts.set(input.key, attempt);

          return attempt;
        }),

        clear: vi.fn(async (key) => attempts.delete(key)),

        deleteStale: vi.fn(async () => 0),
      },
    };

    passwordHasher = {
      name: "test",

      hash: vi.fn(async (value) => `hashed:${value}`),

      verify: vi.fn(async (password, passwordHash) => {
        return passwordHash === `hashed:${password}`;
      }),

      needsRehash: vi.fn(async () => false),
    };
  });

  function createClient() {
    return new MRTIdentityClient({
      adapter,
      passwordHasher,

      loginProtection: {
        maxAttempts: 3,
        attemptWindowMs: 60_000,
        lockDurationMs: 60_000,
        trackByIp: true,
      },
    });
  }

  it("yanlış parola girişini kaydetmelidir", async () => {
    const client = createClient();

    await client.start();

    await expect(
      client.auth.login({
        identifier: "mert@example.com",
        password: "YanlisParola",
        context: {
          ipAddress: "127.0.0.1",
        },
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");

    expect(adapter.loginAttempts?.recordFailure).toHaveBeenCalledTimes(2);
  });

  it("bulunmayan kullanıcı girişini de kaydetmelidir", async () => {
    const client = createClient();

    await client.start();

    await expect(
      client.auth.login({
        identifier: "missing@example.com",
        password: "YanlisParola",
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");

    expect(adapter.loginAttempts?.recordFailure).toHaveBeenCalledTimes(1);
  });

  it("maksimum denemede geçici engel uygulamalıdır", async () => {
    const client = createClient();

    await client.start();

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await expect(
        client.auth.login({
          identifier: "mert@example.com",
          password: "YanlisParola",
        }),
      ).rejects.toThrow("INVALID_CREDENTIALS");
    }

    await expect(
      client.auth.login({
        identifier: "mert@example.com",
        password: "YanlisParola",
      }),
    ).rejects.toThrow("LOGIN_TEMPORARILY_BLOCKED");
  });

  it("aktif kilitte parola doğrulamasına geçmemelidir", async () => {
    const client = createClient();

    await client.start();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await client.auth.login({
          identifier: "mert@example.com",
          password: "YanlisParola",
        });
      } catch {
        // Beklenen giriş hatası.
      }
    }

    vi.mocked(passwordHasher.verify).mockClear();

    await expect(
      client.auth.login({
        identifier: "mert@example.com",
        password: "GucluParola123!",
      }),
    ).rejects.toThrow("LOGIN_TEMPORARILY_BLOCKED");

    expect(passwordHasher.verify).not.toHaveBeenCalled();
  });

  it("başarılı girişte sayaçları temizlemelidir", async () => {
    const client = createClient();

    await client.start();

    try {
      await client.auth.login({
        identifier: "mert@example.com",
        password: "YanlisParola",
        context: {
          ipAddress: "127.0.0.1",
        },
      });
    } catch {
      // İlk başarısız giriş.
    }

    const result = await client.auth.login({
      identifier: "mert@example.com",
      password: "GucluParola123!",
      context: {
        ipAddress: "127.0.0.1",
      },
    });

    expect(result.user.id).toBe("user-1");

    expect(adapter.loginAttempts?.clear).toHaveBeenCalledTimes(2);
  });

  it("koruma devre dışıysa sayaç kullanmamalıdır", async () => {
    const client = new MRTIdentityClient({
      adapter,
      passwordHasher,

      loginProtection: {
        enabled: false,
      },
    });

    await client.start();

    await expect(
      client.auth.login({
        identifier: "mert@example.com",
        password: "YanlisParola",
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");

    expect(adapter.loginAttempts?.recordFailure).not.toHaveBeenCalled();
  });
});
