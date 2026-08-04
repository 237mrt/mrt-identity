export const MRT_IDENTITY_VERSION = "0.1.0";

export interface MRTIdentityClientOptions {
  applicationName?: string;
}

export class MRTIdentityClient {
  public readonly applicationName: string;
  public readonly version = MRT_IDENTITY_VERSION;

  public constructor(options: MRTIdentityClientOptions = {}) {
    this.applicationName =
      options.applicationName ?? "MRT Identity Application";
  }
}
