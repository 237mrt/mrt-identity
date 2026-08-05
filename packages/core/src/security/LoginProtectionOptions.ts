export interface LoginProtectionOptions {
  enabled?: boolean;
  maxAttempts?: number;
  attemptWindowMs?: number;
  lockDurationMs?: number;
  trackByIp?: boolean;
}

export interface ResolvedLoginProtectionOptions {
  enabled: boolean;
  maxAttempts: number;
  attemptWindowMs: number;
  lockDurationMs: number;
  trackByIp: boolean;
}

export const DEFAULT_LOGIN_PROTECTION_OPTIONS: ResolvedLoginProtectionOptions =
  {
    enabled: true,
    maxAttempts: 5,
    attemptWindowMs: 1000 * 60 * 15,
    lockDurationMs: 1000 * 60 * 15,
    trackByIp: true,
  };

export function resolveLoginProtectionOptions(
  options: LoginProtectionOptions = {},
): ResolvedLoginProtectionOptions {
  const resolved: ResolvedLoginProtectionOptions = {
    ...DEFAULT_LOGIN_PROTECTION_OPTIONS,
    ...options,
  };

  if (typeof resolved.enabled !== "boolean") {
    throw new TypeError("loginProtection.enabled boolean olmalıdır.");
  }

  if (!Number.isInteger(resolved.maxAttempts) || resolved.maxAttempts < 1) {
    throw new TypeError(
      "loginProtection.maxAttempts en az 1 olan bir tam sayı olmalıdır.",
    );
  }

  if (
    !Number.isInteger(resolved.attemptWindowMs) ||
    resolved.attemptWindowMs <= 0
  ) {
    throw new TypeError(
      "loginProtection.attemptWindowMs pozitif bir tam sayı olmalıdır.",
    );
  }

  if (
    !Number.isInteger(resolved.lockDurationMs) ||
    resolved.lockDurationMs <= 0
  ) {
    throw new TypeError(
      "loginProtection.lockDurationMs pozitif bir tam sayı olmalıdır.",
    );
  }

  if (typeof resolved.trackByIp !== "boolean") {
    throw new TypeError("loginProtection.trackByIp boolean olmalıdır.");
  }

  return resolved;
}
