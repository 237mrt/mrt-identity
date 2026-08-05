import type {
  CreateIdentitySessionInput,
  CreateIdentityUserInput,
  IdentityAdapter,
  IdentitySession,
  IdentitySessionAdapter,
  IdentityUser,
  IdentityUserAdapter,
  UpdateIdentitySessionInput,
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

function cloneSession(session: IdentitySession): IdentitySession {
  return {
    ...session,

    expiresAt: new Date(session.expiresAt),
    lastUsedAt: new Date(session.lastUsedAt),
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),

    revokedAt: session.revokedAt ? new Date(session.revokedAt) : null,
  };
}

export class MemoryAdapter implements IdentityAdapter {
  public readonly name = "memory";

  private readonly userStore = new Map<string, IdentityUser>();

  private readonly sessionStore = new Map<string, IdentitySession>();

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

  public readonly sessions: IdentitySessionAdapter = {
    create: async (
      data: CreateIdentitySessionInput,
    ): Promise<IdentitySession> => {
      if (this.sessionStore.has(data.id)) {
        throw new Error("SESSION_ID_ALREADY_EXISTS");
      }

      if (!this.userStore.has(data.userId)) {
        throw new Error("SESSION_USER_NOT_FOUND");
      }

      const existingToken = await this.sessions.findByRefreshTokenHash(
        data.refreshTokenHash,
      );

      if (existingToken) {
        throw new Error("SESSION_TOKEN_ALREADY_EXISTS");
      }

      const now = new Date();

      const session: IdentitySession = {
        id: data.id,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,

        ipAddress: data.ipAddress ?? null,

        userAgent: data.userAgent ?? null,

        expiresAt: new Date(data.expiresAt),

        lastUsedAt: data.lastUsedAt ?? now,

        createdAt: data.createdAt ?? now,

        updatedAt: data.updatedAt ?? now,

        revokedAt: data.revokedAt ?? null,
      };

      this.sessionStore.set(session.id, session);

      return cloneSession(session);
    },

    findById: async (id: string): Promise<IdentitySession | null> => {
      const session = this.sessionStore.get(id);

      return session ? cloneSession(session) : null;
    },

    findByRefreshTokenHash: async (
      refreshTokenHash: string,
    ): Promise<IdentitySession | null> => {
      for (const session of this.sessionStore.values()) {
        if (session.refreshTokenHash === refreshTokenHash) {
          return cloneSession(session);
        }
      }

      return null;
    },

    listByUserId: async (userId: string): Promise<IdentitySession[]> => {
      return [...this.sessionStore.values()]
        .filter((session) => session.userId === userId)
        .sort(
          (first, second) =>
            second.createdAt.getTime() - first.createdAt.getTime(),
        )
        .map(cloneSession);
    },

    update: async (
      id: string,
      data: UpdateIdentitySessionInput,
    ): Promise<IdentitySession | null> => {
      const current = this.sessionStore.get(id);

      if (!current) {
        return null;
      }

      if (data.refreshTokenHash !== undefined) {
        const tokenOwner = await this.sessions.findByRefreshTokenHash(
          data.refreshTokenHash,
        );

        if (tokenOwner && tokenOwner.id !== id) {
          throw new Error("SESSION_TOKEN_ALREADY_EXISTS");
        }
      }

      const updatedSession: IdentitySession = {
        ...current,
        ...data,

        expiresAt: data.expiresAt ?? current.expiresAt,

        lastUsedAt: data.lastUsedAt ?? current.lastUsedAt,

        revokedAt:
          data.revokedAt !== undefined ? data.revokedAt : current.revokedAt,

        updatedAt: data.updatedAt ?? new Date(),
      };

      this.sessionStore.set(id, updatedSession);

      return cloneSession(updatedSession);
    },

    revoke: async (
      id: string,
      revokedAt: Date = new Date(),
    ): Promise<boolean> => {
      const session = this.sessionStore.get(id);

      if (!session) {
        return false;
      }

      this.sessionStore.set(id, {
        ...session,
        revokedAt,
        updatedAt: revokedAt,
      });

      return true;
    },

    revokeAllByUserId: async (
      userId: string,
      revokedAt: Date = new Date(),
    ): Promise<number> => {
      let revokedCount = 0;

      for (const [sessionId, session] of this.sessionStore.entries()) {
        if (session.userId !== userId || session.revokedAt) {
          continue;
        }

        this.sessionStore.set(sessionId, {
          ...session,
          revokedAt,
          updatedAt: revokedAt,
        });

        revokedCount += 1;
      }

      return revokedCount;
    },

    deleteExpired: async (before: Date): Promise<number> => {
      let deletedCount = 0;

      for (const [sessionId, session] of this.sessionStore.entries()) {
        if (session.expiresAt.getTime() <= before.getTime()) {
          this.sessionStore.delete(sessionId);

          deletedCount += 1;
        }
      }

      return deletedCount;
    },
  };

  public async initialize(): Promise<void> {
    // Bellek adaptörü harici bağlantı gerektirmez.
  }

  public async disconnect(): Promise<void> {
    this.userStore.clear();
    this.sessionStore.clear();
  }
}
