import { describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  type CreateIdentityUserInput,
  type IdentityAdapter,
  type IdentityUser,
  type PasswordHasher,
  type UpdateIdentityUserInput,
} from "../src/index.ts";

interface TestEnvironmentOptions {
  needsRehash?: boolean;
}

function createTestEnvironment(options: TestEnvironmentOptions = {}) {
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

      update: vi.fn(
        async (
          id: string,
          data: UpdateIdentityUserInput,
        ): Promise<IdentityUser | null> => {
          const index = users.findIndex((user) => user.id === id);

          if (index === -1) {
            return null;
          }

          const currentUser = users[index];

          if (!currentUser) {
            return null;
          }

          const updatedUser: IdentityUser = {
            ...currentUser,
            ...data,
            updatedAt: data.updatedAt ?? new Date(),
          };

          users[index] = updatedUser;

          return updatedUser;
        },
      ),

      delete: vi.fn(async () => false),
    },
  };

  const passwordHasher: PasswordHasher = {
    name: "test",

    hash: vi.fn(async (password: string) => {
      return `rehashed:${password}`;
    }),

    verify: vi.fn(async (password: string, passwordHash: string) => {
      return (
        passwordHash === `hashed:${password}` ||
        passwordHash === `rehashed:${password}`
      );
    }),

    needsRehash: vi.fn(async () => {
      return options.needsRehash ?? false;
    }),
  };

  const client = new MRTIdentityClient({
    adapter,
    passwordHasher,
  });

  function addUser(data: Partial<IdentityUser> = {}): IdentityUser {
    const now = new Date();

    const user: IdentityUser = {
      id: "user-1",
      email: "mert@example.com",
      username: "237mrt",
      passwordHash: "hashed:GucluParola123!",
      emailVerifiedAt: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      ...data,
    };

    users.push(user);

    return user;
  }

  return {
    client,
    adapter,
    passwordHasher,
    users,
    addUser,
  };
}

describe("AuthManager.login", () => {
  it("e-posta adresiyle giriş yapmalıdır", async () => {
    const environment = createTestEnvironment();

    environment.addUser();

    await environment.client.start();

    const result = await environment.client.auth.login({
      identifier: "  MERT@example.com  ",
      password: "GucluParola123!",
    });

    expect(result.user.id).toBe("user-1");

    expect(result.user.email).toBe("mert@example.com");

    expect(result.passwordRehashed).toBe(false);

    expect("passwordHash" in result.user).toBe(false);
  });

  it("kullanıcı adıyla giriş yapmalıdır", async () => {
    const environment = createTestEnvironment();

    environment.addUser();

    await environment.client.start();

    const result = await environment.client.auth.login({
      identifier: "237mrt",
      password: "GucluParola123!",
    });

    expect(result.user.username).toBe("237mrt");
  });

  it("yanlış parolayı reddetmelidir", async () => {
    const environment = createTestEnvironment();

    environment.addUser();

    await environment.client.start();

    await expect(
      environment.client.auth.login({
        identifier: "mert@example.com",
        password: "YanlisParola123!",
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });

  it("bulunmayan kullanıcıyı genel kimlik bilgisi hatasıyla reddetmelidir", async () => {
    const environment = createTestEnvironment();

    await environment.client.start();

    await expect(
      environment.client.auth.login({
        identifier: "yok@example.com",
        password: "GucluParola123!",
      }),
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });

  it("kilitli hesabın girişini reddetmelidir", async () => {
    const environment = createTestEnvironment();

    environment.addUser({
      status: "locked",
    });

    await environment.client.start();

    await expect(
      environment.client.auth.login({
        identifier: "mert@example.com",
        password: "GucluParola123!",
      }),
    ).rejects.toThrow("USER_ACCOUNT_LOCKED");
  });

  it("devre dışı hesabın girişini reddetmelidir", async () => {
    const environment = createTestEnvironment();

    environment.addUser({
      status: "disabled",
    });

    await environment.client.start();

    await expect(
      environment.client.auth.login({
        identifier: "mert@example.com",
        password: "GucluParola123!",
      }),
    ).rejects.toThrow("USER_ACCOUNT_DISABLED");
  });

  it("eski parola hash ayarlarını giriş sırasında güncellemelidir", async () => {
    const environment = createTestEnvironment({
      needsRehash: true,
    });

    environment.addUser();

    await environment.client.start();

    const result = await environment.client.auth.login({
      identifier: "mert@example.com",
      password: "GucluParola123!",
    });

    expect(result.passwordRehashed).toBe(true);

    expect(environment.adapter.users.update).toHaveBeenCalledWith("user-1", {
      passwordHash: "rehashed:GucluParola123!",
    });

    expect(environment.users[0]?.passwordHash).toBe("rehashed:GucluParola123!");
  });
});
