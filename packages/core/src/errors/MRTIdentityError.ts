export type MRTIdentityErrorCode =
  | "CLIENT_NOT_READY"
  | "ADAPTER_NOT_CONFIGURED"
  | "PASSWORD_HASHER_NOT_CONFIGURED"
  | "INVALID_EMAIL"
  | "INVALID_USERNAME"
  | "WEAK_PASSWORD"
  | "USER_EMAIL_ALREADY_EXISTS"
  | "USER_USERNAME_ALREADY_EXISTS"
  | "INVALID_GENERATED_ID";

export class MRTIdentityError extends Error {
  public readonly code: MRTIdentityErrorCode;

  public constructor(code: MRTIdentityErrorCode, message: string = code) {
    super(message);

    this.name = "MRTIdentityError";
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
