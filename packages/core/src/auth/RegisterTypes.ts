import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

export interface RegisterInput {
  email: string;
  username?: string | null;
  password: string;
}

export interface RegisterResult {
  user: PublicIdentityUser;
}
