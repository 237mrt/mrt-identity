import { ApiError } from "../errors/ApiError.js";

export function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      `${fieldName} alanı zorunludur.`,
    );
  }

  return value.trim();
}

export function readOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_REQUEST", `${fieldName} metin olmalıdır.`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue;
}
