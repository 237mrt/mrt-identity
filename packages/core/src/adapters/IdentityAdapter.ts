import type { IdentitySessionAdapter } from "./IdentitySessionAdapter.js";

import type { IdentityUserAdapter } from "./IdentityUserAdapter.js";

export interface IdentityAdapter {
  readonly name: string;
  readonly users: IdentityUserAdapter;

  /**
   * Session desteği adaptör için isteğe bağlıdır.
   *
   * Session işlemlerini kullanacak adaptörlerin
   * bu alanı sağlaması gerekir.
   */
  readonly sessions?: IdentitySessionAdapter;

  initialize?(): Promise<void>;
  disconnect?(): Promise<void>;
}
