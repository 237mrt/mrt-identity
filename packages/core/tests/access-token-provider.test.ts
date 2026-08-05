import { describe, expect, it } from "vitest";

import type {
  AccessTokenPayload,
  AccessTokenProvider,
  AccessTokenVerificationResult,
  CreateAccessTokenInput,
  VerifyAccessTokenInput,
} from "../src/index.js";

class TestAccessTokenProvider implements AccessTokenProvider {
  private readonly tokens = new Map<string, AccessTokenPayload>();

  private counter = 0;

  public async create(input: CreateAccessTokenInput): Promise<string> {
    this.counter += 1;

    const token = [
      "test-access-token",
      input.userId,
      input.sessionId,
      this.counter,
    ].join(".");

    this.tokens.set(token, {
      ...input,
      issuedAt: new Date(input.issuedAt.getTime()),
      expiresAt: new Date(input.expiresAt.getTime()),
    });

    return token;
  }

  public async verify(
    input: VerifyAccessTokenInput,
  ): Promise<AccessTokenVerificationResult> {
    const payload = this.tokens.get(input.token);

    if (!payload) {
      return {
        valid: false,
        reason: "invalid",
      };
    }

    if (payload.expiresAt.getTime() <= Date.now()) {
      return {
        valid: false,
        reason: "expired",
      };
    }

    return {
      valid: true,

      payload: {
        ...payload,
        issuedAt: new Date(payload.issuedAt.getTime()),
        expiresAt: new Date(payload.expiresAt.getTime()),
      },
    };
  }
}

describe("AccessTokenProvider sözleşmesi", () => {
  it("access token oluşturup doğrulamalıdır", async () => {
    const provider = new TestAccessTokenProvider();

    const issuedAt = new Date();

    const expiresAt = new Date(issuedAt.getTime() + 15 * 60 * 1000);

    const token = await provider.create({
      userId: "user-1",
      sessionId: "session-1",
      issuedAt,
      expiresAt,
    });

    const result = await provider.verify({
      token,
    });

    expect(result.valid).toBe(true);

    if (!result.valid) {
      throw new Error("Token geçerli olmalıydı.");
    }

    expect(result.payload.userId).toBe("user-1");

    expect(result.payload.sessionId).toBe("session-1");

    expect(result.payload.issuedAt).toEqual(issuedAt);

    expect(result.payload.expiresAt).toEqual(expiresAt);
  });

  it("bilinmeyen tokenı geçersiz saymalıdır", async () => {
    const provider = new TestAccessTokenProvider();

    const result = await provider.verify({
      token: "bilinmeyen-token",
    });

    expect(result).toEqual({
      valid: false,
      reason: "invalid",
    });
  });

  it("süresi dolmuş tokenı reddetmelidir", async () => {
    const provider = new TestAccessTokenProvider();

    const issuedAt = new Date(Date.now() - 30 * 60 * 1000);

    const expiresAt = new Date(Date.now() - 15 * 60 * 1000);

    const token = await provider.create({
      userId: "user-1",
      sessionId: "session-1",
      issuedAt,
      expiresAt,
    });

    const result = await provider.verify({
      token,
    });

    expect(result).toEqual({
      valid: false,
      reason: "expired",
    });
  });
});
