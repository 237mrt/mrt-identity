import { MRTIdentityClient } from "@mrt-identity/core";

import { MemoryAdapter } from "@mrt-identity/adapter-memory";

import { Argon2PasswordHasher } from "@mrt-identity/password-argon2";

import { OpaqueTokenProvider } from "@mrt-identity/token-opaque";

const adapter = new MemoryAdapter();

const passwordHasher = new Argon2PasswordHasher();

const tokenProvider = new OpaqueTokenProvider();

export const identity = new MRTIdentityClient({
  applicationName: "mrt-identity Express Example",

  adapter,
  passwordHasher,
  tokenProvider,

  sessionDurationMs: 1000 * 60 * 60 * 24 * 30,

  loginProtection: {
    enabled: true,
    maxAttempts: 5,
    attemptWindowMs: 1000 * 60 * 15,
    lockDurationMs: 1000 * 60 * 15,
    trackByIp: true,
  },
});
