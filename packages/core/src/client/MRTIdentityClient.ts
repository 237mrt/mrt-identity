import type { IdentityAdapter } from "../adapters/IdentityAdapter.js";

import { MRT_IDENTITY_VERSION } from "../version.js";

export interface MRTIdentityClientOptions {
  applicationName?: string;
  adapter?: IdentityAdapter;
}

export class MRTIdentityClient {
  public readonly applicationName: string;
  public readonly version = MRT_IDENTITY_VERSION;
  public readonly adapter: IdentityAdapter | null;

  private ready = false;

  public constructor(options: MRTIdentityClientOptions = {}) {
    this.applicationName =
      options.applicationName ?? "MRT Identity Application";

    this.adapter = options.adapter ?? null;
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
