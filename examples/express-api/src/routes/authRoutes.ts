import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";

import { identity } from "../identity.js";

import {
  readOptionalBoolean,
  readOptionalString,
  readRequiredString,
} from "../utils/RequestValidation.js";

interface RegisterRequestBody {
  email?: unknown;
  username?: unknown;
  password?: unknown;
}

interface LoginRequestBody {
  identifier?: unknown;
  password?: unknown;
}

interface RefreshRequestBody {
  refreshToken?: unknown;
}

interface LogoutRequestBody {
  refreshToken?: unknown;
}

interface ListSessionsQuery {
  includeRevoked?: string;
  includeExpired?: string;
}

export const authRouter: ExpressRouter = Router();

authRouter.post(
  "/register",
  async (
    request: Request<Record<string, never>, unknown, RegisterRequestBody>,
    response: Response,
  ): Promise<void> => {
    const email = readRequiredString(request.body.email, "email");

    const username = readOptionalString(request.body.username, "username");

    const password = readRequiredString(request.body.password, "password", {
      trim: false,
    });

    const result = await identity.auth.register({
      email,
      password,

      ...(username !== undefined ? { username } : {}),
    });

    response.status(201).json({
      success: true,

      data: {
        user: result.user,
      },
    });
  },
);

authRouter.post(
  "/login",
  async (
    request: Request<Record<string, never>, unknown, LoginRequestBody>,
    response: Response,
  ): Promise<void> => {
    const identifier = readRequiredString(
      request.body.identifier,
      "identifier",
    );

    const password = readRequiredString(request.body.password, "password", {
      trim: false,
    });

    const result = await identity.auth.login({
      identifier,
      password,

      context: {
        ipAddress: request.ip ?? null,

        userAgent: request.get("user-agent") ?? null,
      },
    });

    response.setHeader("Cache-Control", "no-store");

    response.status(200).json({
      success: true,

      data: {
        user: result.user,

        session: result.session ?? null,

        refreshToken: result.refreshToken ?? null,

        passwordRehashed: result.passwordRehashed,
      },
    });
  },
);

authRouter.post(
  "/refresh",
  async (
    request: Request<Record<string, never>, unknown, RefreshRequestBody>,
    response: Response,
  ): Promise<void> => {
    const refreshToken = readRequiredString(
      request.body.refreshToken,
      "refreshToken",
      {
        trim: false,
      },
    );

    const result = await identity.auth.refresh({
      refreshToken,

      context: {
        ipAddress: request.ip ?? null,

        userAgent: request.get("user-agent") ?? null,
      },
    });

    response.setHeader("Cache-Control", "no-store");

    response.status(200).json({
      success: true,

      data: {
        user: result.user,
        session: result.session,
        refreshToken: result.refreshToken,
      },
    });
  },
);

authRouter.post(
  "/logout",
  async (
    request: Request<Record<string, never>, unknown, LogoutRequestBody>,
    response: Response,
  ): Promise<void> => {
    const refreshToken = readRequiredString(
      request.body.refreshToken,
      "refreshToken",
      {
        trim: false,
      },
    );

    const result = await identity.auth.logout({
      refreshToken,
    });

    response.status(200).json({
      success: true,

      data: {
        revoked: result.revoked,
      },
    });
  },
);

authRouter.post(
  "/logout-all",
  async (request: Request, response: Response): Promise<void> => {
    const userId = readRequiredString(request.get("x-user-id"), "x-user-id");

    const result = await identity.auth.logoutAll({
      userId,
    });

    response.status(200).json({
      success: true,

      data: {
        revokedCount: result.revokedCount,
      },
    });
  },
);

authRouter.get(
  "/sessions",
  async (
    request: Request<
      Record<string, never>,
      unknown,
      unknown,
      ListSessionsQuery
    >,
    response: Response,
  ): Promise<void> => {
    const userId = readRequiredString(request.get("x-user-id"), "x-user-id");

    const includeRevoked = readOptionalBoolean(
      request.query.includeRevoked,
      "includeRevoked",
    );

    const includeExpired = readOptionalBoolean(
      request.query.includeExpired,
      "includeExpired",
    );

    const result = await identity.auth.listSessions({
      userId,

      ...(includeRevoked !== undefined ? { includeRevoked } : {}),

      ...(includeExpired !== undefined ? { includeExpired } : {}),
    });

    response.setHeader("Cache-Control", "no-store");

    response.status(200).json({
      success: true,

      data: {
        sessions: result.sessions,
      },
    });
  },
);
