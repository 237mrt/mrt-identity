import type { PublicIdentitySession } from "../types/PublicIdentitySession.js";

import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

export interface AuthenticateInput {
  /**
   * İstemciden alınan düz metin
   * access token.
   */
  accessToken: string;
}

export interface AuthenticateResult {
  /**
   * Tokenın ait olduğu kullanıcı.
   */
  user: PublicIdentityUser;

  /**
   * Tokenın bağlı olduğu session.
   */
  session: PublicIdentitySession;

  /**
   * Access tokenın geçerliliğinin
   * sona ereceği zaman.
   */
  accessTokenExpiresAt: Date;
}
