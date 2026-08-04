import { describe, expect, it, vi } from "vitest";

import {
  MRTIdentityClient,
  MRT_IDENTITY_VERSION,
  type IdentityAdapter,
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

describe("MRTIdentityClient", () => {
  it("varsayılan uygulama adıyla oluşturulabilmelidir", () => {
    const client = new MRTIdentityClient();

    expect(client.applicationName).toBe("MRT Identity Application");
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

  it("adaptör ile başlatılabilmelidir", async () => {
    const adapter = createTestAdapter();

    const client = new MRTIdentityClient({
      adapter,
    });

    await client.start();

    expect(client.isReady).toBe(true);
    expect(adapter.initialize).toHaveBeenCalledOnce();
  });

  it("adaptör olmadan başlatılamamalıdır", async () => {
    const client = new MRTIdentityClient();

    await expect(client.start()).rejects.toThrow("ADAPTER_NOT_CONFIGURED");
  });

  it("durdurulduğunda adaptör bağlantısını kapatmalıdır", async () => {
    const adapter = createTestAdapter();

    const client = new MRTIdentityClient({
      adapter,
    });

    await client.start();
    await client.stop();

    expect(client.isReady).toBe(false);
    expect(adapter.disconnect).toHaveBeenCalledOnce();
  });
});
