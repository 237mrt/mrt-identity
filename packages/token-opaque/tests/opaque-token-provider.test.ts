import { describe, expect, it } from "vitest";

import { OpaqueTokenProvider } from "../src/index.ts";

describe("OpaqueTokenProvider", () => {
  it("token ve hash üretmelidir", async () => {
    const provider = new OpaqueTokenProvider();

    const result = await provider.generate();

    expect(result.token.length).toBeGreaterThan(32);

    expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("doğru tokeni doğrulamalıdır", async () => {
    const provider = new OpaqueTokenProvider();

    const result = await provider.generate();

    expect(await provider.verify(result.token, result.tokenHash)).toBe(true);
  });

  it("yanlış tokeni reddetmelidir", async () => {
    const provider = new OpaqueTokenProvider();

    const result = await provider.generate();

    expect(await provider.verify("yanlis-token", result.tokenHash)).toBe(false);
  });

  it("geçersiz hash değerini reddetmelidir", async () => {
    const provider = new OpaqueTokenProvider();

    expect(await provider.verify("token", "gecersiz-hash")).toBe(false);
  });

  it("her üretimde farklı token oluşturmalıdır", async () => {
    const provider = new OpaqueTokenProvider();

    const first = await provider.generate();

    const second = await provider.generate();

    expect(first.token).not.toBe(second.token);

    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("aynı token için aynı hash değerini üretmelidir", async () => {
    const provider = new OpaqueTokenProvider();

    const firstHash = await provider.hash("test-token");

    const secondHash = await provider.hash("test-token");

    expect(firstHash).toBe(secondHash);
  });

  it("güvensiz token uzunluğunu reddetmelidir", () => {
    expect(
      () =>
        new OpaqueTokenProvider({
          byteLength: 16,
        }),
    ).toThrow("byteLength en az 32 olan bir tam sayı olmalıdır.");
  });
});
