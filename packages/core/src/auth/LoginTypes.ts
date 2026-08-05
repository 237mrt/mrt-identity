import type { PublicIdentitySession } from "../types/PublicIdentitySession.js";

import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

import type { SessionContext } from "./SessionAuthTypes.js";

export interface LoginInput {
  /**
   * Kullanıcının e-posta adresi veya kullanıcı adı.
   */
  identifier: string;

  /**
   * Kullanıcının düz metin parolası.
   */
  password: string;

  /**
   * Giriş isteğine ait cihaz ve ağ bilgileri.
   */
  context?: SessionContext;
}

export interface LoginResult {
  user: PublicIdentityUser;
  passwordRehashed: boolean;

  /**
   * Session sistemi yapılandırılmışsa oluşturulur.
   */
  session?: PublicIdentitySession;

  /**
   * Yalnızca oluşturulduğu anda kullanıcıya döndürülür.
   * Adaptörde düz metin olarak saklanmaz.
   */
  refreshToken?: string;
}
