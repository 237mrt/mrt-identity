import { describe, expect, it } from "vitest";

import { MRTIdentityClient, MRT_IDENTITY_VERSION } from "../src/index.ts";

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
});
