import { beforeEach, describe, expect, it } from "vitest";

import { MemoryAdapter } from "../src/index.ts";

describe("MemoryAdapter", () => {
  let adapter: MemoryAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.initialize();
  });

  it("kullanıcı oluşturabilmelidir", async () => {
    const user = await adapter.users.create({
      id: "user-1",
      email: "mert@example.com",
      username: "237mrt",
      passwordHash: "hashed-password",
    });

    expect(user.id).toBe("user-1");
    expect(user.email).toBe("mert@example.com");
    expect(user.status).toBe("active");
  });

  it("e-posta adresini büyük-küçük harf duyarsız bulmalıdır", async () => {
    await adapter.users.create({
      id: "user-1",
      email: "Mert@Example.com",
      passwordHash: "hashed-password",
    });

    const user = await adapter.users.findByEmail("mert@example.com");

    expect(user?.id).toBe("user-1");
  });

  it("aynı e-posta ile ikinci kullanıcı oluşturmamalıdır", async () => {
    await adapter.users.create({
      id: "user-1",
      email: "mert@example.com",
      passwordHash: "hashed-password",
    });

    await expect(
      adapter.users.create({
        id: "user-2",
        email: "MERT@example.com",
        passwordHash: "hashed-password",
      }),
    ).rejects.toThrow("USER_EMAIL_ALREADY_EXISTS");
  });

  it("kullanıcıyı güncelleyebilmelidir", async () => {
    await adapter.users.create({
      id: "user-1",
      email: "mert@example.com",
      username: "237mrt",
      passwordHash: "hashed-password",
    });

    const updatedUser = await adapter.users.update("user-1", {
      username: "mrtdev",
      status: "locked",
    });

    expect(updatedUser?.username).toBe("mrtdev");

    expect(updatedUser?.status).toBe("locked");
  });

  it("kullanıcıyı silebilmelidir", async () => {
    await adapter.users.create({
      id: "user-1",
      email: "mert@example.com",
      passwordHash: "hashed-password",
    });

    const deleted = await adapter.users.delete("user-1");

    const user = await adapter.users.findById("user-1");

    expect(deleted).toBe(true);
    expect(user).toBeNull();
  });
});
