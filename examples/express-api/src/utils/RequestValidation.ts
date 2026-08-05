import { ApiError } from "../errors/ApiError.js";

interface RequiredStringOptions {
  trim?: boolean;
}

export function readRequiredString(
  value: unknown,
  fieldName: string,
  options: RequiredStringOptions = {},
): string {
  if (typeof value !== "string") {
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      `${fieldName} alanı zorunludur.`,
    );
  }

  const resolvedValue = options.trim === false ? value : value.trim();

  if (resolvedValue.length === 0) {
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      `${fieldName} alanı zorunludur.`,
    );
  }

  return resolvedValue;
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

  return normalizedValue || undefined;
}

export function readOptionalBoolean(
  value: unknown,
  fieldName: string,
): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === "true" || normalizedValue === "1") {
      return true;
    }

    if (normalizedValue === "false" || normalizedValue === "0") {
      return false;
    }
  }

  throw new ApiError(
    400,
    "INVALID_REQUEST",
    `${fieldName} true veya false olmalıdır.`,
  );
}
