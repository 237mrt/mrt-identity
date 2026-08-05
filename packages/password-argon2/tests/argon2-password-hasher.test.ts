import { describe, expect, it } from "vitest";

import { Argon2PasswordHasher } from "../src/index.ts";

describe("Argon2PasswordHasher", () => {
  it("Argon2id hash oluşturmalıdır", async () => {
    const hasher = new Argon2PasswordHasher();

    const passwordHash = await hasher.hash("GucluParola123!");

    expect(passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("doğru parolayı doğrulamalıdır", async () => {
    const hasher = new Argon2PasswordHasher();

    const password = "GucluParola123!";
    const passwordHash = await hasher.hash(password);

    expect(await hasher.verify(password, passwordHash)).toBe(true);
  });

  it("yanlış parolayı reddetmelidir", async () => {
    const hasher = new Argon2PasswordHasher();

    const passwordHash = await hasher.hash("DogruParola123!");

    expect(await hasher.verify("YanlisParola123!", passwordHash)).toBe(false);
  });

  it("geçersiz hash değerini reddetmelidir", async () => {
    const hasher = new Argon2PasswordHasher();

    expect(await hasher.verify("GucluParola123!", "gecersiz-hash")).toBe(false);
  });

  it("aynı parola için farklı hash değerleri üretmelidir", async () => {
    const hasher = new Argon2PasswordHasher();

    const firstHash = await hasher.hash("GucluParola123!");

    const secondHash = await hasher.hash("GucluParola123!");

    expect(firstHash).not.toBe(secondHash);
  });

  it("kendi oluşturduğu hash için yeniden hash istememelidir", async () => {
    const hasher = new Argon2PasswordHasher();

    const passwordHash = await hasher.hash("GucluParola123!");

    expect(hasher.needsRehash(passwordHash)).toBe(false);
  });

  it("eski ayarlarla oluşturulmuş hash için yeniden hash istemelidir", async () => {
    const oldHasher = new Argon2PasswordHasher({
      memoryCost: 12_288,
    });

    const currentHasher = new Argon2PasswordHasher();

    const oldPasswordHash = await oldHasher.hash("GucluParola123!");

    expect(currentHasher.needsRehash(oldPasswordHash)).toBe(true);
  });

  it("geçersiz yapılandırmayı reddetmelidir", () => {
    expect(
      () =>
        new Argon2PasswordHasher({
          memoryCost: 0,
        }),
    ).toThrow("memoryCost pozitif bir tam sayı olmalıdır.");
  });
});
