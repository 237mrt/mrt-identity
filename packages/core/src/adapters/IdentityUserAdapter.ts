import type {
  CreateIdentityUserInput,
  IdentityUser,
  UpdateIdentityUserInput,
} from "../types/IdentityUser.js";

export interface IdentityUserAdapter {
  create(data: CreateIdentityUserInput): Promise<IdentityUser>;

  findById(id: string): Promise<IdentityUser | null>;

  findByEmail(email: string): Promise<IdentityUser | null>;

  findByUsername(username: string): Promise<IdentityUser | null>;

  update(
    id: string,
    data: UpdateIdentityUserInput,
  ): Promise<IdentityUser | null>;

  delete(id: string): Promise<boolean>;
}
