export interface IdentitySession {
  id: string;
  userId: string;
  refreshTokenHash: string;

  ipAddress: string | null;
  userAgent: string | null;

  expiresAt: Date;
  lastUsedAt: Date;

  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export interface CreateIdentitySessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;

  ipAddress?: string | null;
  userAgent?: string | null;

  expiresAt: Date;
  lastUsedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
  revokedAt?: Date | null;
}

export interface UpdateIdentitySessionInput {
  refreshTokenHash?: string;

  ipAddress?: string | null;
  userAgent?: string | null;

  expiresAt?: Date;
  lastUsedAt?: Date;
  updatedAt?: Date;
  revokedAt?: Date | null;
}
