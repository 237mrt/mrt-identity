import * as argon2 from "argon2";

import type { PasswordHasher } from "@mrt-identity/core";

export interface Argon2PasswordHasherOptions {
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
  hashLength?: number;
}

interface ResolvedArgon2Options {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  hashLength: number;
}

export const ARGON2_DEFAULT_OPTIONS: Readonly<ResolvedArgon2Options> = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${name} pozitif bir tam sayı olmalıdır.`);
  }
}

export class Argon2PasswordHasher implements PasswordHasher {
  public readonly name = "argon2id";

  private readonly options: ResolvedArgon2Options;

  public constructor(options: Argon2PasswordHasherOptions = {}) {
    this.options = {
      memoryCost: options.memoryCost ?? ARGON2_DEFAULT_OPTIONS.memoryCost,

      timeCost: options.timeCost ?? ARGON2_DEFAULT_OPTIONS.timeCost,

      parallelism: options.parallelism ?? ARGON2_DEFAULT_OPTIONS.parallelism,

      hashLength: options.hashLength ?? ARGON2_DEFAULT_OPTIONS.hashLength,
    };

    assertPositiveInteger("memoryCost", this.options.memoryCost);

    assertPositiveInteger("timeCost", this.options.timeCost);

    assertPositiveInteger("parallelism", this.options.parallelism);

    assertPositiveInteger("hashLength", this.options.hashLength);
  }

  public async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.options.memoryCost,
      timeCost: this.options.timeCost,
      parallelism: this.options.parallelism,
      hashLength: this.options.hashLength,
    });
  }

  public async verify(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  public needsRehash(passwordHash: string): boolean {
    try {
      return argon2.needsRehash(passwordHash, {
        memoryCost: this.options.memoryCost,
        timeCost: this.options.timeCost,
        parallelism: this.options.parallelism,
      });
    } catch {
      return true;
    }
  }
}
