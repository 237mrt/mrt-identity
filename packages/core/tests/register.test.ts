import { describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type CreateIdentityUserInput,
  type IdentityAdapter,
  type IdentityUser,
  type PasswordHasher,
} from "../src/index.ts";

function createTestEnvironment() {
  const users: IdentityUser[] = [];

  const adapter: IdentityAdapter = {
    name: "test",

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

      findById: vi.fn(async (id: string) => {
        return users.find((user) => user.id === id) ?? null;
      }),

      findByEmail: vi.fn(async (email: string) => {
        return users.find((user) => user.email === email) ?? null;
      }),

      findByUsername: vi.fn(async (username: string) => {
        return users.find((user) => user.username === username) ?? null;
      }),

      update: vi.fn(async () => null),

      delete: vi.fn(async () => false),
    },
  };

  const passwordHasher: PasswordHasher = {
    name: "test",

    hash: vi.fn(async (password: string) => {
      return `hashed:${password}`;
    }),

    verify: vi.fn(async (password: string, passwordHash: string) => {
      return passwordHash === `hashed:${password}`;
    }),
  };

  const client = new MRTIdentityClient({
    adapter,
    passwordHasher,
    idGenerator: () => "user-1",
  });

  return {
    client,
    adapter,
    passwordHasher,
    users,
  };
}

describe("AuthManager.register", () => {
  it("yeni kullanıcı oluşturmalıdır", async () => {
    const { client, passwordHasher } = createTestEnvironment();

    await client.start();

    const result = await client.auth.register({
      email: "  MERT@Example.com ",
      username: "237mrt",
      password: "GucluParola123!",
    });

    expect(result.user.id).toBe("user-1");

    expect(result.user.email).toBe("mert@example.com");

    expect(result.user.username).toBe("237mrt");

    expect("passwordHash" in result.user).toBe(false);

    expect(passwordHasher.hash).toHaveBeenCalledWith("GucluParola123!");
  });

  it("client başlamadan kayıt oluşturmamalıdır", async () => {
    const { client } = createTestEnvironment();

    await expect(
      client.auth.register({
        email: "mert@example.com",
        password: "GucluParola123!",
      }),
    ).rejects.toThrow("CLIENT_NOT_READY");
  });

  it("geçersiz e-postayı reddetmelidir", async () => {
    const { client } = createTestEnvironment();

    await client.start();

    await expect(
      client.auth.register({
        email: "gecersiz-email",
        password: "GucluParola123!",
      }),
    ).rejects.toThrow("INVALID_EMAIL");
  });

  it("zayıf parolayı reddetmelidir", async () => {
    const { client } = createTestEnvironment();

    await client.start();

    await expect(
      client.auth.register({
        email: "mert@example.com",
        password: "123",
      }),
    ).rejects.toThrow("PASSWORD_TOO_SHORT");
  });

  it("aynı e-posta ile ikinci kayıt oluşturmamalıdır", async () => {
    const { client } = createTestEnvironment();

    await client.start();

    await client.auth.register({
      email: "mert@example.com",
      password: "GucluParola123!",
    });

    await expect(
      client.auth.register({
        email: "MERT@example.com",
        password: "BaskaParola123!",
      }),
    ).rejects.toThrow("USER_EMAIL_ALREADY_EXISTS");
  });

  it("aynı kullanıcı adıyla ikinci kayıt oluşturmamalıdır", async () => {
    const { client } = createTestEnvironment();

    await client.start();

    await client.auth.register({
      email: "mert@example.com",
      username: "237mrt",
      password: "GucluParola123!",
    });

    await expect(
      client.auth.register({
        email: "diger@example.com",
        username: "237mrt",
        password: "BaskaParola123!",
      }),
    ).rejects.toThrow("USER_USERNAME_ALREADY_EXISTS");
  });
});
