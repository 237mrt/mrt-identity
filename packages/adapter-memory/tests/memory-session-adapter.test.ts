import { beforeEach, describe, expect, it } from "vitest";

import { MemoryAdapter } from "../src/index.ts";

describe("MemoryAdapter sessions", () => {
  let adapter: MemoryAdapter;

  beforeEach(async () => {
    adapter = new MemoryAdapter();

    await adapter.initialize();

    await adapter.users.create({
      id: "user-1",
      email: "mert@example.com",
      passwordHash: "hashed-password",
    });
  });

  it("session oluşturabilmelidir", async () => {
    const expiresAt = new Date(Date.now() + 60_000);

    const session = await adapter.sessions.create({
      id: "session-1",
      userId: "user-1",
      refreshTokenHash: "token-hash",
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
      expiresAt,
    });

    expect(session.id).toBe("session-1");

    expect(session.userId).toBe("user-1");

    expect(session.revokedAt).toBeNull();
  });

  it("token hash ile session bulabilmelidir", async () => {
    await adapter.sessions.create({
      id: "session-1",
      userId: "user-1",
      refreshTokenHash: "token-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const session = await adapter.sessions.findByRefreshTokenHash("token-hash");

    expect(session?.id).toBe("session-1");
  });

  it("session iptal edebilmelidir", async () => {
    await adapter.sessions.create({
      id: "session-1",
      userId: "user-1",
      refreshTokenHash: "token-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const revoked = await adapter.sessions.revoke("session-1");

    const session = await adapter.sessions.findById("session-1");

    expect(revoked).toBe(true);
    expect(session?.revokedAt).toBeInstanceOf(Date);
  });

  it("kullanıcının bütün sessionlarını iptal edebilmelidir", async () => {
    await adapter.sessions.create({
      id: "session-1",
      userId: "user-1",
      refreshTokenHash: "token-hash-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await adapter.sessions.create({
      id: "session-2",
      userId: "user-1",
      refreshTokenHash: "token-hash-2",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const count = await adapter.sessions.revokeAllByUserId("user-1");

    expect(count).toBe(2);

    const sessions = await adapter.sessions.listByUserId("user-1");

    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it("süresi dolmuş sessionları silebilmelidir", async () => {
    await adapter.sessions.create({
      id: "expired-session",
      userId: "user-1",
      refreshTokenHash: "expired-token-hash",
      expiresAt: new Date(Date.now() - 60_000),
    });

    await adapter.sessions.create({
      id: "active-session",
      userId: "user-1",
      refreshTokenHash: "active-token-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });

    const deletedCount = await adapter.sessions.deleteExpired(new Date());

    expect(deletedCount).toBe(1);

    expect(await adapter.sessions.findById("expired-session")).toBeNull();

    expect(await adapter.sessions.findById("active-session")).not.toBeNull();
  });
});
