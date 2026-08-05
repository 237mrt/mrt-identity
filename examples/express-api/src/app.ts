import express, { type Express, type Request, type Response } from "express";

import { errorHandler } from "./middleware/errorHandler.js";

import { authRouter } from "./routes/authRoutes.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    express.json({
      limit: "32kb",
    }),
  );

  app.get("/health", (_request: Request, response: Response) => {
    response.status(200).json({
      success: true,
      service: "mrt-identity Express Example",
    });
  });

  app.use("/auth", authRouter);

  app.use((request: Request, response: Response) => {
    response.status(404).json({
      success: false,

      error: {
        code: "ROUTE_NOT_FOUND",
        message: `${request.method} ${request.path} bulunamadı.`,
      },
    });
  });

  /*
   * Error middleware bütün route ve
   * 404 tanımlarından sonra gelmelidir.
   */
  app.use(errorHandler);

  return app;
}
