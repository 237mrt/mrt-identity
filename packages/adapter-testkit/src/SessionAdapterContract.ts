import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  IdentityAdapter,
  IdentitySessionAdapter,
} from "@mrt-identity/core";

import type { IdentityAdapterFactory } from "./AdapterTestFactory.js";

export function runSessionAdapterContractTests(
  adapterName: string,
  createAdapter: IdentityAdapterFactory,
): void {
  describe(`${adapterName} session adapter sözleşmesi`, () => {
    let adapter: IdentityAdapter;

    function getSessions(): IdentitySessionAdapter {
      const sessions = adapter.sessions;

      if (!sessions) {
        throw new Error(`${adapterName} session desteği sağlamıyor.`);
      }

      return sessions;
    }

    beforeEach(async () => {
      adapter = await createAdapter();

      await adapter.initialize?.();

      if (!adapter.sessions) {
        throw new Error(`${adapterName} session desteği sağlamıyor.`);
      }

      await adapter.users.create({
        id: "user-1",
        email: "mert@example.com",
        passwordHash: "hashed-password",
      });
    });

    afterEach(async () => {
      await adapter.disconnect?.();
    });

    it("session oluşturup kimlikle bulmalıdır", async () => {
      const sessions = getSessions();

      const createdSession = await sessions.create({
        id: "session-1",
        userId: "user-1",
        refreshTokenHash: "token-hash-1",

        expiresAt: new Date(Date.now() + 60_000),
      });

      const foundSession = await sessions.findById("session-1");

      expect(foundSession).toEqual(createdSession);
    });

    it("sessionı token hash değeriyle bulmalıdır", async () => {
      const sessions = getSessions();

      await sessions.create({
        id: "session-1",
        userId: "user-1",
        refreshTokenHash: "token-hash-1",

        expiresAt: new Date(Date.now() + 60_000),
      });

      const foundSession =
        await sessions.findByRefreshTokenHash("token-hash-1");

      expect(foundSession?.id).toBe("session-1");
    });

    it("kullanıcının sessionlarını listelemelidir", async () => {
      const sessions = getSessions();

      await sessions.create({
        id: "session-1",
        userId: "user-1",
        refreshTokenHash: "token-hash-1",

        expiresAt: new Date(Date.now() + 60_000),
      });

      await sessions.create({
        id: "session-2",
        userId: "user-1",
        refreshTokenHash: "token-hash-2",

        expiresAt: new Date(Date.now() + 60_000),
      });

      const userSessions = await sessions.listByUserId("user-1");

      expect(userSessions).toHaveLength(2);
    });

    it("sessionı güncellemelidir", async () => {
      const sessions = getSessions();

      await sessions.create({
        id: "session-1",
        userId: "user-1",
        refreshTokenHash: "old-token-hash",

        expiresAt: new Date(Date.now() + 60_000),
      });

      const updatedSession = await sessions.update("session-1", {
        refreshTokenHash: "new-token-hash",

        ipAddress: "127.0.0.1",

        userAgent: "Contract Test",
      });

      expect(updatedSession).toEqual(
        expect.objectContaining({
          id: "session-1",
          refreshTokenHash: "new-token-hash",
          ipAddress: "127.0.0.1",
          userAgent: "Contract Test",
        }),
      );
    });

    it("tek sessionı iptal etmelidir", async () => {
      const sessions = getSessions();

      await sessions.create({
        id: "session-1",
        userId: "user-1",
        refreshTokenHash: "token-hash-1",

        expiresAt: new Date(Date.now() + 60_000),
      });

      const revoked = await sessions.revoke("session-1");

      const session = await sessions.findById("session-1");

      expect(revoked).toBe(true);

      expect(session?.revokedAt).toBeInstanceOf(Date);
    });

    it("kullanıcının bütün sessionlarını iptal etmelidir", async () => {
      const sessions = getSessions();

      await sessions.create({
        id: "session-1",
        userId: "user-1",
        refreshTokenHash: "token-hash-1",

        expiresAt: new Date(Date.now() + 60_000),
      });

      await sessions.create({
        id: "session-2",
        userId: "user-1",
        refreshTokenHash: "token-hash-2",

        expiresAt: new Date(Date.now() + 60_000),
      });

      const revokedCount = await sessions.revokeAllByUserId("user-1");

      expect(revokedCount).toBe(2);
    });

    it("süresi dolmuş sessionları silmelidir", async () => {
      const sessions = getSessions();

      await sessions.create({
        id: "expired-session",
        userId: "user-1",
        refreshTokenHash: "expired-token-hash",

        expiresAt: new Date(Date.now() - 60_000),
      });

      await sessions.create({
        id: "active-session",
        userId: "user-1",
        refreshTokenHash: "active-token-hash",

        expiresAt: new Date(Date.now() + 60_000),
      });

      const deletedCount = await sessions.deleteExpired(new Date());

      expect(deletedCount).toBe(1);

      expect(await sessions.findById("expired-session")).toBeNull();

      expect(await sessions.findById("active-session")).not.toBeNull();
    });
  });
}
