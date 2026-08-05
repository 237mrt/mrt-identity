import type { MRTIdentityClient } from "../client/MRTIdentityClient.js";

import { MRTIdentityError } from "../errors/MRTIdentityError.js";

import type { IdentityUser } from "../types/IdentityUser.js";

import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

import type { RegisterInput, RegisterResult } from "./RegisterTypes.js";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string | null | undefined): string | null {
  const normalizedUsername = username?.trim();

  return normalizedUsername || null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 32 && !/\s/.test(username);
}

function toPublicIdentityUser(user: IdentityUser): PublicIdentityUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;

  return {
    ...publicUser,
    emailVerifiedAt: publicUser.emailVerifiedAt
      ? new Date(publicUser.emailVerifiedAt)
      : null,
    createdAt: new Date(publicUser.createdAt),
    updatedAt: new Date(publicUser.updatedAt),
  };
}

function convertAdapterError(error: unknown): never {
  if (error instanceof MRTIdentityError) {
    throw error;
  }

  if (error instanceof Error) {
    if (error.message === "USER_EMAIL_ALREADY_EXISTS") {
      throw new MRTIdentityError("USER_EMAIL_ALREADY_EXISTS");
    }

    if (error.message === "USER_USERNAME_ALREADY_EXISTS") {
      throw new MRTIdentityError("USER_USERNAME_ALREADY_EXISTS");
    }
  }

  throw error;
}

export class AuthManager {
  private readonly client: MRTIdentityClient;

  public constructor(client: MRTIdentityClient) {
    this.client = client;
  }

  public async register(input: RegisterInput): Promise<RegisterResult> {
    this.client.assertReady();

    const adapter = this.client.adapter;
    const passwordHasher = this.client.passwordHasher;

    if (!adapter || !passwordHasher) {
      throw new MRTIdentityError("CLIENT_NOT_READY");
    }

    const email = normalizeEmail(input.email);

    if (!isValidEmail(email)) {
      throw new MRTIdentityError("INVALID_EMAIL");
    }

    const username = normalizeUsername(input.username);

    if (username && !isValidUsername(username)) {
      throw new MRTIdentityError("INVALID_USERNAME");
    }

    const passwordValidation = await this.client.passwordPolicy.validate(
      input.password,
    );

    if (!passwordValidation.valid) {
      throw new MRTIdentityError(
        "WEAK_PASSWORD",
        passwordValidation.issues.join(","),
      );
    }

    const existingEmail = await adapter.users.findByEmail(email);

    if (existingEmail) {
      throw new MRTIdentityError("USER_EMAIL_ALREADY_EXISTS");
    }

    if (username) {
      const existingUsername = await adapter.users.findByUsername(username);

      if (existingUsername) {
        throw new MRTIdentityError("USER_USERNAME_ALREADY_EXISTS");
      }
    }

    const passwordHash = await passwordHasher.hash(input.password);

    const id = this.client.generateId();

    try {
      const user = await adapter.users.create({
        id,
        email,
        username,
        passwordHash,
        status: "active",
      });

      return {
        user: toPublicIdentityUser(user),
      };
    } catch (error) {
      return convertAdapterError(error);
    }
  }
}
