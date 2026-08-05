import { describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type CreateIdentityUserInput,
  type IdentityAdapter,
  type IdentityUser,
  type PasswordHasher,
} from "../src/index.ts";

function createEnvironment() {
  const users: IdentityUser[] = [];

  const adapter: IdentityAdapter = {
    name: "event-test",

    users: {
      create: vi.fn(
        async (data: CreateIdentityUserInput): Promise<IdentityUser> => {
          const now = new Date();

          const user: IdentityUser = {
            id: data.id,
            email: data.email,
            username: data.username ?? null,

            passwordHash: data.passwordHash,

            emailVerifiedAt: data.emailVerifiedAt ?? null,

            status: data.status ?? "active",

            createdAt: data.createdAt ?? now,

            updatedAt: data.updatedAt ?? now,
          };

          users.push(user);

          return user;
        },
      ),

      findById: vi.fn(async (id) => {
        return users.find((user) => user.id === id) ?? null;
      }),

      findByEmail: vi.fn(async (email) => {
        return users.find((user) => user.email === email) ?? null;
      }),

      findByUsername: vi.fn(async (username) => {
        return users.find((user) => user.username === username) ?? null;
      }),

      update: vi.fn(async () => null),

      delete: vi.fn(async () => false),
    },
  };

  const passwordHasher: PasswordHasher = {
    name: "event-test",

    hash: vi.fn(async (password) => `hashed:${password}`),

    verify: vi.fn(async (password, passwordHash) => {
      return passwordHash === `hashed:${password}`;
    }),

    needsRehash: vi.fn(async () => false),
  };

  const client = new MRTIdentityClient({
    adapter,
    passwordHasher,
    loginProtection: {
      enabled: false,
    },
    idGenerator: () => "user-1",
  });

  return {
    client,
    users,
  };
}

describe("AuthManager eventleri", () => {
  it("kayıt başarılı olduğunda userRegistered yayınlamalıdır", async () => {
    const environment = createEnvironment();

    const listener = vi.fn();

    environment.client.on("userRegistered", listener);

    await environment.client.start();

    await environment.client.auth.register({
      email: "mert@example.com",
      username: "237mrt",
      password: "GucluParola123!",
    });

    expect(listener).toHaveBeenCalledTimes(1);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user-1",
          email: "mert@example.com",
        }),

        occurredAt: expect.any(Date),
      }),
    );
  });

  it("yanlış parolada loginFailed yayınlamalıdır", async () => {
    const environment = createEnvironment();

    const listener = vi.fn();

    environment.client.on("loginFailed", listener);

    await environment.client.start();

    await environment.client.auth.register({
      email: "mert@example.com",
      username: "237mrt",
      password: "GucluParola123!",
    });

    await expect(
      environment.client.auth.login({
        identifier: "mert@example.com",

        password: "YanlisParola123!",
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "mert@example.com",

        reason: "INVALID_CREDENTIALS",

        context: null,
        occurredAt: expect.any(Date),
      }),
    );
  });

  it("başarılı girişte loginSucceeded yayınlamalıdır", async () => {
    const environment = createEnvironment();

    const listener = vi.fn();

    environment.client.on("loginSucceeded", listener);

    await environment.client.start();

    await environment.client.auth.register({
      email: "mert@example.com",
      username: "237mrt",
      password: "GucluParola123!",
    });

    await environment.client.auth.login({
      identifier: "mert@example.com",

      password: "GucluParola123!",

      context: {
        ipAddress: "127.0.0.1",
        userAgent: "Vitest",
      },
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user-1",
        }),

        session: null,

        context: {
          ipAddress: "127.0.0.1",
          userAgent: "Vitest",
        },

        occurredAt: expect.any(Date),
      }),
    );
  });

  it("event listener hatası kayıt işlemini bozmamalıdır", async () => {
    const environment = createEnvironment();

    environment.client.on("userRegistered", async () => {
      throw new Error("Test listener hatası");
    });

    await environment.client.start();

    await expect(
      environment.client.auth.register({
        email: "mert@example.com",
        username: "237mrt",
        password: "GucluParola123!",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        user: expect.objectContaining({
          id: "user-1",
        }),
      }),
    );
  });
});
