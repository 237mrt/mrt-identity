import { beforeEach, describe, expect, it } from "vitest";

import { MemoryAdapter } from "../src/index.ts";

describe("MemoryAdapter loginAttempts", () => {
  let adapter: MemoryAdapter;

  const baseTime = new Date("2026-08-05T12:00:00.000Z");

  beforeEach(async () => {
    adapter = new MemoryAdapter();
    await adapter.initialize();
  });

  function recordFailure(occurredAt: Date = baseTime) {
    return adapter.loginAttempts.recordFailure({
      key: "identifier-hash",
      scope: "identifier",
      occurredAt,
      maxAttempts: 3,
      attemptWindowMs: 15 * 60 * 1000,
      lockDurationMs: 15 * 60 * 1000,
    });
  }

  it("ilk başarısız giriş kaydını oluşturmalıdır", async () => {
    const attempt = await recordFailure();

    expect(attempt.key).toBe("identifier-hash");

    expect(attempt.failedAttempts).toBe(1);

    expect(attempt.lockedUntil).toBeNull();
  });

  it("başarısız giriş sayısını artırmalıdır", async () => {
    await recordFailure(baseTime);

    const secondAttempt = await recordFailure(
      new Date(baseTime.getTime() + 1_000),
    );

    expect(secondAttempt.failedAttempts).toBe(2);

    expect(secondAttempt.lockedUntil).toBeNull();
  });

  it("maksimum deneme sayısında geçici kilit uygulamalıdır", async () => {
    await recordFailure(baseTime);

    await recordFailure(new Date(baseTime.getTime() + 1_000));

    const thirdAttempt = await recordFailure(
      new Date(baseTime.getTime() + 2_000),
    );

    expect(thirdAttempt.failedAttempts).toBe(3);

    expect(thirdAttempt.lockedUntil).toEqual(
      new Date(baseTime.getTime() + 2_000 + 15 * 60 * 1000),
    );
  });

  it("aktif kilit sırasında kilit süresini uzatmamalıdır", async () => {
    await recordFailure(baseTime);

    await recordFailure(new Date(baseTime.getTime() + 1_000));

    const lockedAttempt = await recordFailure(
      new Date(baseTime.getTime() + 2_000),
    );

    const repeatedAttempt = await recordFailure(
      new Date(baseTime.getTime() + 10_000),
    );

    expect(repeatedAttempt.failedAttempts).toBe(3);

    expect(repeatedAttempt.lockedUntil).toEqual(lockedAttempt.lockedUntil);
  });

  it("takip penceresi dolduğunda sayacı sıfırlamalıdır", async () => {
    await recordFailure(baseTime);

    await recordFailure(new Date(baseTime.getTime() + 1_000));

    const resetAttempt = await recordFailure(
      new Date(baseTime.getTime() + 15 * 60 * 1000),
    );

    expect(resetAttempt.failedAttempts).toBe(1);

    expect(resetAttempt.lockedUntil).toBeNull();
  });

  it("başarılı giriş sonrasında kaydı temizleyebilmelidir", async () => {
    await recordFailure();

    const cleared = await adapter.loginAttempts.clear("identifier-hash");

    const attempt = await adapter.loginAttempts.findByKey("identifier-hash");

    expect(cleared).toBe(true);
    expect(attempt).toBeNull();
  });

  it("eski kayıtları silebilmelidir", async () => {
    await recordFailure(baseTime);

    const deletedCount = await adapter.loginAttempts.deleteStale(
      new Date(baseTime.getTime() + 60 * 60 * 1000),
    );

    expect(deletedCount).toBe(1);

    expect(await adapter.loginAttempts.findByKey("identifier-hash")).toBeNull();
  });
});
