import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { IdentityAdapter } from "@mrt-identity/core";

import type { IdentityAdapterFactory } from "./AdapterTestFactory.js";

export function runUserAdapterContractTests(
  adapterName: string,
  createAdapter: IdentityAdapterFactory,
): void {
  describe(`${adapterName} kullanıcı adapter sözleşmesi`, () => {
    let adapter: IdentityAdapter;

    beforeEach(async () => {
      adapter = await createAdapter();

      await adapter.initialize?.();
    });

    afterEach(async () => {
      await adapter.disconnect?.();
    });

    it("kullanıcı oluşturup kimlikle bulmalıdır", async () => {
      const user = await adapter.users.create({
        id: "user-1",
        email: "mert@example.com",
        username: "237mrt",
        passwordHash: "hashed-password",
      });

      const foundUser = await adapter.users.findById(user.id);

      expect(foundUser).toEqual(user);
    });

    it("kullanıcıyı e-posta ve kullanıcı adıyla bulmalıdır", async () => {
      await adapter.users.create({
        id: "user-1",
        email: "mert@example.com",
        username: "237mrt",
        passwordHash: "hashed-password",
      });

      const emailUser = await adapter.users.findByEmail("mert@example.com");

      const usernameUser = await adapter.users.findByUsername("237mrt");

      expect(emailUser?.id).toBe("user-1");

      expect(usernameUser?.id).toBe("user-1");
    });

    it("aynı e-posta adresine sahip ikinci kullanıcıyı reddetmelidir", async () => {
      await adapter.users.create({
        id: "user-1",
        email: "mert@example.com",
        username: "237mrt",
        passwordHash: "hashed-password",
      });

      await expect(
        adapter.users.create({
          id: "user-2",
          email: "mert@example.com",
          username: "other-user",
          passwordHash: "hashed-password",
        }),
      ).rejects.toThrow("USER_EMAIL_ALREADY_EXISTS");
    });

    it("aynı kullanıcı adına sahip ikinci kullanıcıyı reddetmelidir", async () => {
      await adapter.users.create({
        id: "user-1",
        email: "mert@example.com",
        username: "237mrt",
        passwordHash: "hashed-password",
      });

      await expect(
        adapter.users.create({
          id: "user-2",
          email: "other@example.com",
          username: "237mrt",
          passwordHash: "hashed-password",
        }),
      ).rejects.toThrow("USER_USERNAME_ALREADY_EXISTS");
    });

    it("kullanıcı bilgilerini güncellemelidir", async () => {
      await adapter.users.create({
        id: "user-1",
        email: "mert@example.com",
        username: "237mrt",
        passwordHash: "hashed-password",
      });

      const updatedUser = await adapter.users.update("user-1", {
        email: "updated@example.com",
        username: "updated-user",
        status: "locked",
      });

      expect(updatedUser).toEqual(
        expect.objectContaining({
          id: "user-1",
          email: "updated@example.com",
          username: "updated-user",
          status: "locked",
        }),
      );
    });

    it("kullanıcıyı silmelidir", async () => {
      await adapter.users.create({
        id: "user-1",
        email: "mert@example.com",
        passwordHash: "hashed-password",
      });

      const deleted = await adapter.users.delete("user-1");

      expect(deleted).toBe(true);

      expect(await adapter.users.findById("user-1")).toBeNull();
    });
  });
}
