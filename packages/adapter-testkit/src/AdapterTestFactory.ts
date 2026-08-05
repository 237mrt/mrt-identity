import type { IdentityAdapter } from "@mrt-identity/core";

export type IdentityAdapterFactory = () =>
  | IdentityAdapter
  | Promise<IdentityAdapter>;
