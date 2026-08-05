import { randomUUID } from "node:crypto";

import type { IdentityAdapter } from "../adapters/IdentityAdapter.js";

import { AuthManager } from "../auth/AuthManager.js";

import { MRTIdentityError } from "../errors/MRTIdentityError.js";

import type { PasswordHasher } from "../password/PasswordHasher.js";

import type { TokenProvider } from "../tokens/TokenProvider.js";

import { resolveLoginProtectionOptions } from "../security/LoginProtectionOptions.js";

import type {
  LoginProtectionOptions,
  ResolvedLoginProtectionOptions,
} from "../security/LoginProtectionOptions.js";

import {
  BasicPasswordPolicy,
  type PasswordPolicy,
} from "../password/PasswordPolicy.js";

import { MRT_IDENTITY_VERSION } from "../version.js";

export interface MRTIdentityClientOptions {
  applicationName?: string;
  adapter?: IdentityAdapter;
  passwordHasher?: PasswordHasher;
  passwordPolicy?: PasswordPolicy;
  tokenProvider?: TokenProvider;
  loginProtection?: LoginProtectionOptions;
  sessionDurationMs?: number;
  idGenerator?: () => string;
}

export class MRTIdentityClient {
  public readonly applicationName: string;
  public readonly version = MRT_IDENTITY_VERSION;

  public readonly loginProtection: ResolvedLoginProtectionOptions;
  public readonly adapter: IdentityAdapter | null;
  public readonly passwordHasher: PasswordHasher | null;
  public readonly passwordPolicy: PasswordPolicy;
  public readonly tokenProvider: TokenProvider | null;
  public readonly sessionDurationMs: number;
  public readonly auth: AuthManager;

  private readonly idGenerator: () => string;
  private ready = false;

  public constructor(options: MRTIdentityClientOptions = {}) {
    this.applicationName =
      options.applicationName ?? "mrt-identity application";

    this.adapter = options.adapter ?? null;

    this.passwordHasher = options.passwordHasher ?? null;

    this.tokenProvider = options.tokenProvider ?? null;

    this.loginProtection = resolveLoginProtectionOptions(
      options.loginProtection,
    );

    this.sessionDurationMs =
      options.sessionDurationMs ?? 1000 * 60 * 60 * 24 * 30;

    if (
      !Number.isInteger(this.sessionDurationMs) ||
      this.sessionDurationMs <= 0
    ) {
      throw new TypeError("sessionDurationMs pozitif bir tam sayı olmalıdır.");
    }

    this.passwordPolicy = options.passwordPolicy ?? new BasicPasswordPolicy();

    this.idGenerator = options.idGenerator ?? randomUUID;

    this.auth = new AuthManager(this);
  }

  public get isReady(): boolean {
    return this.ready;
  }

  public assertReady(): void {
    if (!this.ready) {
      throw new MRTIdentityError("CLIENT_NOT_READY");
    }
  }

  public generateId(): string {
    const id = this.idGenerator().trim();

    if (!id) {
      throw new MRTIdentityError("INVALID_GENERATED_ID");
    }

    return id;
  }

  public async start(): Promise<void> {
    if (this.ready) {
      return;
    }

    if (!this.adapter) {
      throw new MRTIdentityError("ADAPTER_NOT_CONFIGURED");
    }

    if (!this.passwordHasher) {
      throw new MRTIdentityError("PASSWORD_HASHER_NOT_CONFIGURED");
    }

    await this.adapter.initialize?.();

    this.ready = true;
  }

  public async stop(): Promise<void> {
    if (!this.ready) {
      return;
    }

    await this.adapter?.disconnect?.();

    this.ready = false;
  }
}
