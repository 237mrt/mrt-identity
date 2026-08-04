import type { IdentityUserAdapter } from "./IdentityUserAdapter.js";

export interface IdentityAdapter {
  readonly name: string;
  readonly users: IdentityUserAdapter;

  initialize?(): Promise<void>;
  disconnect?(): Promise<void>;
}
