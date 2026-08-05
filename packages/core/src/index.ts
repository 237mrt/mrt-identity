export { MRT_IDENTITY_VERSION } from "./version.js";

export { MRTIdentityClient } from "./client/MRTIdentityClient.js";

export type { MRTIdentityClientOptions } from "./client/MRTIdentityClient.js";

export { AuthManager } from "./auth/AuthManager.js";

export type { RegisterInput, RegisterResult } from "./auth/RegisterTypes.js";

export { MRTIdentityError } from "./errors/MRTIdentityError.js";

export type { MRTIdentityErrorCode } from "./errors/MRTIdentityError.js";

export type { IdentityAdapter } from "./adapters/IdentityAdapter.js";

export type { IdentityUserAdapter } from "./adapters/IdentityUserAdapter.js";

export type { PasswordHasher } from "./password/PasswordHasher.js";

export { BasicPasswordPolicy } from "./password/PasswordPolicy.js";

export type {
  BasicPasswordPolicyOptions,
  PasswordPolicy,
  PasswordValidationIssue,
  PasswordValidationResult,
} from "./password/PasswordPolicy.js";

export type {
  CreateIdentityUserInput,
  IdentityUser,
  IdentityUserStatus,
  UpdateIdentityUserInput,
} from "./types/IdentityUser.js";

export type { IdentitySessionAdapter } from "./adapters/IdentitySessionAdapter.js";

export type { GeneratedToken, TokenProvider } from "./tokens/TokenProvider.js";

export type {
  ListSessionsInput,
  ListSessionsResult,
  LogoutAllInput,
  LogoutAllResult,
  LogoutInput,
  LogoutResult,
  RefreshInput,
  RefreshResult,
  SessionContext,
} from "./auth/SessionAuthTypes.js";

export type {
  CreateIdentitySessionInput,
  IdentitySession,
  UpdateIdentitySessionInput,
} from "./types/IdentitySession.js";

export type { PublicIdentitySession } from "./types/PublicIdentitySession.js";

export type { LoginInput, LoginResult } from "./auth/LoginTypes.js";

export type { PublicIdentityUser } from "./types/PublicIdentityUser.js";
