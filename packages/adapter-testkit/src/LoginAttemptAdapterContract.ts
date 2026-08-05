import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type {
  IdentityAdapter,
  IdentityLoginAttemptAdapter,
} from "@mrt-identity/core";

import type { IdentityAdapterFactory } from "./AdapterTestFactory.js";

export function runLoginAttemptAdapterContractTests(
  adapterName: string,
  createAdapter: IdentityAdapterFactory,
): void {
  describe(`${adapterName} login attempt adapter sözleşmesi`, () => {
    let adapter: IdentityAdapter;

    const baseTime = new Date("2026-08-05T12:00:00.000Z");

    function getLoginAttempts(): IdentityLoginAttemptAdapter {
      const loginAttempts = adapter.loginAttempts;

      if (!loginAttempts) {
        throw new Error(`${adapterName} login attempt desteği sağlamıyor.`);
      }

      return loginAttempts;
    }

    beforeEach(async () => {
      adapter = await createAdapter();

      await adapter.initialize?.();

      if (!adapter.loginAttempts) {
        throw new Error(`${adapterName} login attempt desteği sağlamıyor.`);
      }
    });

    afterEach(async () => {
      await adapter.disconnect?.();
    });

    async function recordFailure(occurredAt: Date) {
      return getLoginAttempts().recordFailure({
        key: "attempt-key",
        scope: "identifier",
        occurredAt,
        maxAttempts: 3,
        attemptWindowMs: 15 * 60 * 1000,
        lockDurationMs: 15 * 60 * 1000,
      });
    }

    it("ilk başarısız girişi kaydetmelidir", async () => {
      const attempt = await recordFailure(baseTime);

      expect(attempt.failedAttempts).toBe(1);

      expect(attempt.lockedUntil).toBeNull();
    });

    it("sayacı artırıp maksimum denemede kilit uygulamalıdır", async () => {
      await recordFailure(baseTime);

      await recordFailure(new Date(baseTime.getTime() + 1_000));

      const thirdAttempt = await recordFailure(
        new Date(baseTime.getTime() + 2_000),
      );

      expect(thirdAttempt.failedAttempts).toBe(3);

      expect(thirdAttempt.lockedUntil).toBeInstanceOf(Date);
    });

    it("başarılı giriş sonrasında kaydı temizlemelidir", async () => {
      const loginAttempts = getLoginAttempts();

      await recordFailure(baseTime);

      const cleared = await loginAttempts.clear("attempt-key");

      expect(cleared).toBe(true);

      expect(await loginAttempts.findByKey("attempt-key")).toBeNull();
    });

    it("eski kayıtları silmelidir", async () => {
      const loginAttempts = getLoginAttempts();

      await recordFailure(baseTime);

      const deletedCount = await loginAttempts.deleteStale(
        new Date(baseTime.getTime() + 60 * 60 * 1000),
      );

      expect(deletedCount).toBe(1);
    });
  });
}
