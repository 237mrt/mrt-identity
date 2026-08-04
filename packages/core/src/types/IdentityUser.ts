export type IdentityUserStatus = "active" | "locked" | "disabled";

export interface IdentityUser {
  id: string;
  email: string;
  username: string | null;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  status: IdentityUserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIdentityUserInput {
  id: string;
  email: string;
  username?: string | null;
  passwordHash: string;
  emailVerifiedAt?: Date | null;
  status?: IdentityUserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateIdentityUserInput {
  email?: string;
  username?: string | null;
  passwordHash?: string;
  emailVerifiedAt?: Date | null;
  status?: IdentityUserStatus;
  updatedAt?: Date;
}
