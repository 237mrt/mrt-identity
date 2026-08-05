import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { GeneratedToken, TokenProvider } from "@mrt-identity/core";

export interface OpaqueTokenProviderOptions {
  byteLength?: number;
}

export const DEFAULT_TOKEN_BYTE_LENGTH = 48;

function createTokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export class OpaqueTokenProvider implements TokenProvider {
  public readonly name = "opaque-sha256";

  public readonly byteLength: number;

  public constructor(options: OpaqueTokenProviderOptions = {}) {
    this.byteLength = options.byteLength ?? DEFAULT_TOKEN_BYTE_LENGTH;

    if (!Number.isInteger(this.byteLength) || this.byteLength < 32) {
      throw new TypeError("byteLength en az 32 olan bir tam sayı olmalıdır.");
    }
  }

  public async generate(): Promise<GeneratedToken> {
    const token = randomBytes(this.byteLength).toString("base64url");

    return {
      token,
      tokenHash: createTokenHash(token),
    };
  }

  public async hash(token: string): Promise<string> {
    return createTokenHash(token);
  }

  public async verify(token: string, tokenHash: string): Promise<boolean> {
    if (!/^[a-f0-9]{64}$/i.test(tokenHash)) {
      return false;
    }

    const actualHash = createTokenHash(token);

    const actualBuffer = Buffer.from(actualHash, "hex");

    const expectedBuffer = Buffer.from(tokenHash, "hex");

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }
}
