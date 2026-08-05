export interface PasswordHasher {
  readonly name: string;

  hash(password: string): Promise<string>;

  verify(password: string, passwordHash: string): Promise<boolean>;

  needsRehash?(passwordHash: string): boolean | Promise<boolean>;
}
