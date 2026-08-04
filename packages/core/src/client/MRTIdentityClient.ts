import type { IdentityAdapter } from "../adapters/IdentityAdapter.js";

import type { PasswordHasher } from "../password/PasswordHasher.js";

import { MRT_IDENTITY_VERSION } from "../version.js";

export interface MRTIdentityClientOptions {
  applicationName?: string;
  adapter?: IdentityAdapter;
  passwordHasher?: PasswordHasher;
}

export class MRTIdentityClient {
  public readonly applicationName: string;
  public readonly version = MRT_IDENTITY_VERSION;

  public readonly adapter: IdentityAdapter | null;
  public readonly passwordHasher: PasswordHasher | null;

  private ready = false;

  public constructor(options: MRTIdentityClientOptions = {}) {
    this.applicationName =
      options.applicationName ?? "mrt-identity application";

    this.adapter = options.adapter ?? null;

    this.passwordHasher = options.passwordHasher ?? null;
  }

  public get isReady(): boolean {
    return this.ready;
  }

  public async start(): Promise<void> {
    if (this.ready) {
      return;
    }

    if (!this.adapter) {
      throw new Error("ADAPTER_NOT_CONFIGURED");
    }

    if (!this.passwordHasher) {
      throw new Error("PASSWORD_HASHER_NOT_CONFIGURED");
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
