import type { IdentityLoginAttemptAdapter } from "./IdentityLoginAttemptAdapter.js";

import type { IdentitySessionAdapter } from "./IdentitySessionAdapter.js";

import type { IdentityUserAdapter } from "./IdentityUserAdapter.js";

export interface IdentityAdapter {
  readonly name: string;
  readonly users: IdentityUserAdapter;

  readonly sessions?: IdentitySessionAdapter;

  /**
   * Başarısız giriş ve brute-force koruması desteği.
   *
   * Bu özellik kullanılacaksa adapter tarafından
   * sağlanmalıdır.
   */
  readonly loginAttempts?: IdentityLoginAttemptAdapter;

  initialize?(): Promise<void>;
  disconnect?(): Promise<void>;
}
