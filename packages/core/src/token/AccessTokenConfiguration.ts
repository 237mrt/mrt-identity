export const DEFAULT_ACCESS_TOKEN_DURATION_MS = 15 * 60 * 1000;

export function resolveAccessTokenDurationMs(
  value: number | undefined,
): number {
  const resolvedValue = value ?? DEFAULT_ACCESS_TOKEN_DURATION_MS;

  if (!Number.isSafeInteger(resolvedValue) || resolvedValue <= 0) {
    throw new TypeError(
      "accessTokenDurationMs pozitif ve güvenli bir tam sayı olmalıdır.",
    );
  }

  return resolvedValue;
}
