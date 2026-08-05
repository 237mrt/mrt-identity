import { describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  MRT_IDENTITY_VERSION,
  type IdentityAdapter,
  type PasswordHasher,
} from "../src/index.ts";

function createTestAdapter(): IdentityAdapter {
  return {
    name: "test",

    users: {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },

    initialize: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createTestPasswordHasher(): PasswordHasher {
  return {
    name: "test",

    hash: vi.fn(async (password: string): Promise<string> => {
      return `hashed:${password}`;
    }),

    verify: vi.fn(
      async (password: string, passwordHash: string): Promise<boolean> => {
        return passwordHash === `hashed:${password}`;
      },
    ),
  };
}

describe("MRTIdentityClient", () => {
  it("varsayılan uygulama adıyla oluşturulabilmelidir", () => {
    const client = new MRTIdentityClient();

    expect(client.applicationName).toBe("mrt-identity application");
  });

  it("tip güvenli event listener kaydedebilmelidir", async () => {
    const client = new MRTIdentityClient();

    const listener = vi.fn();

    client.on("userRegistered", listener);

    const now = new Date();

    await client.emitEvent("userRegistered", {
      user: {
        id: "user-1",
        email: "mert@example.com",
        username: "237mrt",
        emailVerifiedAt: null,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },

      occurredAt: now,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("özel uygulama adını kabul etmelidir", () => {
    const client = new MRTIdentityClient({
      applicationName: "Test Uygulaması",
    });

    expect(client.applicationName).toBe("Test Uygulaması");
  });

  it("doğru framework sürümünü taşımalıdır", () => {
    const client = new MRTIdentityClient();

    expect(client.version).toBe(MRT_IDENTITY_VERSION);
  });

  it("gerekli sağlayıcılarla başlatılabilmelidir", async () => {
    const adapter = createTestAdapter();
    const passwordHasher = createTestPasswordHasher();

    const client = new MRTIdentityClient({
      adapter,
      passwordHasher,
    });

    await client.start();

    expect(client.isReady).toBe(true);

    expect(adapter.initialize).toHaveBeenCalledOnce();
  });

  it("adaptör olmadan başlatılamamalıdır", async () => {
    const client = new MRTIdentityClient({
      passwordHasher: createTestPasswordHasher(),
    });

    await expect(client.start()).rejects.toThrow("ADAPTER_NOT_CONFIGURED");
  });

  it("parola sağlayıcısı olmadan başlatılamamalıdır", async () => {
    const client = new MRTIdentityClient({
      adapter: createTestAdapter(),
    });

    await expect(client.start()).rejects.toThrow(
      "PASSWORD_HASHER_NOT_CONFIGURED",
    );
  });

  it("durdurulduğunda adaptör bağlantısını kapatmalıdır", async () => {
    const adapter = createTestAdapter();

    const client = new MRTIdentityClient({
      adapter,
      passwordHasher: createTestPasswordHasher(),
    });

    await client.start();
    await client.stop();

    expect(client.isReady).toBe(false);

    expect(adapter.disconnect).toHaveBeenCalledOnce();
  });

  it("geçersiz session süresini reddetmelidir", () => {
    expect(
      () =>
        new MRTIdentityClient({
          sessionDurationMs: 0,
        }),
    ).toThrow("sessionDurationMs pozitif bir tam sayı olmalıdır.");
  });

  it("geçersiz maksimum giriş denemesini reddetmelidir", () => {
    expect(
      () =>
        new MRTIdentityClient({
          loginProtection: {
            maxAttempts: 0,
          },
        }),
    ).toThrow(
      "loginProtection.maxAttempts en az 1 olan bir tam sayı olmalıdır.",
    );
  });
});
