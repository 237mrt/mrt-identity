export { MRT_IDENTITY_VERSION } from "./version.js";

export { MRTIdentityClient } from "./client/MRTIdentityClient.js";

export type { MRTIdentityClientOptions } from "./client/MRTIdentityClient.js";

export type { IdentityAdapter } from "./adapters/IdentityAdapter.js";

export type { IdentityUserAdapter } from "./adapters/IdentityUserAdapter.js";

export type {
  CreateIdentityUserInput,
  IdentityUser,
  IdentityUserStatus,
  UpdateIdentityUserInput,
} from "./types/IdentityUser.js";
