import type { IdentityUser } from "./IdentityUser.js";

export type PublicIdentityUser = Omit<IdentityUser, "passwordHash">;
