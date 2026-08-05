export type MRTIdentityErrorCode =
  | "CLIENT_NOT_READY"
  | "ADAPTER_NOT_CONFIGURED"
  | "PASSWORD_HASHER_NOT_CONFIGURED"
  | "INVALID_EMAIL"
  | "INVALID_USERNAME"
  | "WEAK_PASSWORD"
  | "USER_EMAIL_ALREADY_EXISTS"
  | "USER_USERNAME_ALREADY_EXISTS"
  | "INVALID_GENERATED_ID"
  | "INVALID_CREDENTIALS"
  | "USER_ACCOUNT_LOCKED"
  | "USER_ACCOUNT_DISABLED"
  | "SESSION_SUPPORT_NOT_CONFIGURED"
  | "TOKEN_PROVIDER_NOT_CONFIGURED"
  | "INVALID_REFRESH_TOKEN"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "LOGIN_TEMPORARILY_BLOCKED"
  | "ACCESS_TOKEN_PROVIDER_NOT_CONFIGURED"
  | "INVALID_ACCESS_TOKEN"
  | "ACCESS_TOKEN_EXPIRED"
  | "SESSION_USER_NOT_FOUND";

export class MRTIdentityError extends Error {
  public readonly code: MRTIdentityErrorCode;

  public constructor(code: MRTIdentityErrorCode, message: string = code) {
    super(message);

    this.name = "MRTIdentityError";
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
