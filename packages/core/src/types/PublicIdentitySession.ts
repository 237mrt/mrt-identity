import type { IdentitySession } from "./IdentitySession.js";

export type PublicIdentitySession = Omit<IdentitySession, "refreshTokenHash">;
