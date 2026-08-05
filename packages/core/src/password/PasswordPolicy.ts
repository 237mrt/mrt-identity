export type PasswordValidationIssue =
  | "PASSWORD_TOO_SHORT"
  | "PASSWORD_TOO_LONG";

export interface PasswordValidationResult {
  valid: boolean;
  issues: PasswordValidationIssue[];
}

export interface PasswordPolicy {
  validate(
    password: string,
  ): PasswordValidationResult | Promise<PasswordValidationResult>;
}

export interface BasicPasswordPolicyOptions {
  minLength?: number;
  maxLength?: number;
}

export class BasicPasswordPolicy implements PasswordPolicy {
  public readonly minLength: number;
  public readonly maxLength: number;

  public constructor(options: BasicPasswordPolicyOptions = {}) {
    this.minLength = options.minLength ?? 10;
    this.maxLength = options.maxLength ?? 128;

    if (!Number.isInteger(this.minLength) || this.minLength <= 0) {
      throw new TypeError("minLength pozitif bir tam sayı olmalıdır.");
    }

    if (!Number.isInteger(this.maxLength) || this.maxLength < this.minLength) {
      throw new TypeError("maxLength, minLength değerinden küçük olamaz.");
    }
  }

  public validate(password: string): PasswordValidationResult {
    const issues: PasswordValidationIssue[] = [];

    if (password.length < this.minLength) {
      issues.push("PASSWORD_TOO_SHORT");
    }

    if (password.length > this.maxLength) {
      issues.push("PASSWORD_TOO_LONG");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
