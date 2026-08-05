import type { PublicIdentitySession } from "../types/PublicIdentitySession.js";

import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

export interface SessionContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface RefreshInput {
  /**
   * Kullanıcıya daha önce verilen düz metin refresh token.
   */
  refreshToken: string;

  /**
   * Yenileme isteğinin cihaz ve ağ bilgileri.
   */
  context?: SessionContext;
}

export interface RefreshResult {
  user: PublicIdentityUser;
  session: PublicIdentitySession;

  /**
   * Rotation sonucunda oluşturulan
   * yeni refresh token.
   */
  refreshToken: string;

  /**
   * Access-token provider
   * yapılandırılmışsa oluşturulur.
   */
  accessToken?: string;

  /**
   * Access tokenın geçerliliğinin
   * sona ereceği zaman.
   */
  accessTokenExpiresAt?: Date;
}

export interface LogoutInput {
  refreshToken: string;
}

export interface LogoutResult {
  revoked: boolean;
}

export interface LogoutAllInput {
  userId: string;
}

export interface LogoutAllResult {
  revokedCount: number;
}

export interface ListSessionsInput {
  userId: string;

  /**
   * İptal edilmiş sessionların da listelenmesini sağlar.
   */
  includeRevoked?: boolean;

  /**
   * Süresi dolmuş sessionların da listelenmesini sağlar.
   */
  includeExpired?: boolean;
}

export interface ListSessionsResult {
  sessions: PublicIdentitySession[];
}
