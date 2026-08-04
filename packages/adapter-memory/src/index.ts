import type {
  CreateIdentityUserInput,
  IdentityAdapter,
  IdentityUser,
  IdentityUserAdapter,
  UpdateIdentityUserInput,
} from "@mrt-identity/core";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function cloneUser(user: IdentityUser): IdentityUser {
  return {
    ...user,

    emailVerifiedAt: user.emailVerifiedAt
      ? new Date(user.emailVerifiedAt)
      : null,

    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  };
}

export class MemoryAdapter implements IdentityAdapter {
  public readonly name = "memory";

  private readonly userStore = new Map<string, IdentityUser>();

  public readonly users: IdentityUserAdapter = {
    create: async (data: CreateIdentityUserInput): Promise<IdentityUser> => {
      if (this.userStore.has(data.id)) {
        throw new Error("USER_ID_ALREADY_EXISTS");
      }

      const normalizedEmail = normalizeEmail(data.email);

      const existingEmail = await this.users.findByEmail(normalizedEmail);

      if (existingEmail) {
        throw new Error("USER_EMAIL_ALREADY_EXISTS");
      }

      const username = data.username?.trim() || null;

      if (username) {
        const existingUsername = await this.users.findByUsername(username);

        if (existingUsername) {
          throw new Error("USER_USERNAME_ALREADY_EXISTS");
        }
      }

      const now = new Date();

      const user: IdentityUser = {
        id: data.id,
        email: normalizedEmail,
        username,
        passwordHash: data.passwordHash,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        status: data.status ?? "active",
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
      };

      this.userStore.set(user.id, user);

      return cloneUser(user);
    },

    findById: async (id: string): Promise<IdentityUser | null> => {
      const user = this.userStore.get(id);

      return user ? cloneUser(user) : null;
    },

    findByEmail: async (email: string): Promise<IdentityUser | null> => {
      const normalizedEmail = normalizeEmail(email);

      for (const user of this.userStore.values()) {
        if (user.email === normalizedEmail) {
          return cloneUser(user);
        }
      }

      return null;
    },

    findByUsername: async (username: string): Promise<IdentityUser | null> => {
      const normalizedUsername = normalizeUsername(username);

      for (const user of this.userStore.values()) {
        if (
          user.username &&
          normalizeUsername(user.username) === normalizedUsername
        ) {
          return cloneUser(user);
        }
      }

      return null;
    },

    update: async (
      id: string,
      data: UpdateIdentityUserInput,
    ): Promise<IdentityUser | null> => {
      const current = this.userStore.get(id);

      if (!current) {
        return null;
      }

      const nextEmail =
        data.email !== undefined ? normalizeEmail(data.email) : current.email;

      const emailOwner = await this.users.findByEmail(nextEmail);

      if (emailOwner && emailOwner.id !== id) {
        throw new Error("USER_EMAIL_ALREADY_EXISTS");
      }

      const nextUsername =
        data.username !== undefined
          ? data.username?.trim() || null
          : current.username;

      if (nextUsername) {
        const usernameOwner = await this.users.findByUsername(nextUsername);

        if (usernameOwner && usernameOwner.id !== id) {
          throw new Error("USER_USERNAME_ALREADY_EXISTS");
        }
      }

      const updatedUser: IdentityUser = {
        ...current,
        ...data,
        email: nextEmail,
        username: nextUsername,
        updatedAt: data.updatedAt ?? new Date(),
      };

      this.userStore.set(id, updatedUser);

      return cloneUser(updatedUser);
    },

    delete: async (id: string): Promise<boolean> => {
      return this.userStore.delete(id);
    },
  };

  public async initialize(): Promise<void> {
    // Bellek adaptörü harici bağlantı gerektirmez.
  }

  public async disconnect(): Promise<void> {
    this.userStore.clear();
  }
}
