import type {
  CreateIdentitySessionInput,
  IdentitySession,
  UpdateIdentitySessionInput,
} from "../types/IdentitySession.js";

export interface IdentitySessionAdapter {
  create(data: CreateIdentitySessionInput): Promise<IdentitySession>;

  findById(id: string): Promise<IdentitySession | null>;

  findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<IdentitySession | null>;

  listByUserId(userId: string): Promise<IdentitySession[]>;

  update(
    id: string,
    data: UpdateIdentitySessionInput,
  ): Promise<IdentitySession | null>;

  revoke(id: string, revokedAt?: Date): Promise<boolean>;

  revokeAllByUserId(userId: string, revokedAt?: Date): Promise<number>;

  deleteExpired(before: Date): Promise<number>;
}
