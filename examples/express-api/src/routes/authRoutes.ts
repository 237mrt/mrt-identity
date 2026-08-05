import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";

import { identity } from "../identity.js";

import {
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

export const authRouter: ExpressRouter = Router();

authRouter.post(
  "/register",
  async (
    request: Request<Record<string, never>, unknown, RegisterRequestBody>,
    response: Response,
  ): Promise<void> => {
    const email = readRequiredString(request.body.email, "email");

    const username = readOptionalString(request.body.username, "username");

    const password = readRequiredString(request.body.password, "password");

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

    const password = readRequiredString(request.body.password, "password");

    const result = await identity.auth.login({
      identifier,
      password,

      context: {
        ipAddress: request.ip ?? null,

        userAgent: request.get("user-agent") ?? null,
      },
    });

    /*
     * Kimlik doğrulama cevaplarının tarayıcı
     * veya proxy tarafından önbelleğe alınmasını
     * engeller.
     */
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
