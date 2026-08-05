import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

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

  app.use((request: Request, response: Response) => {
    response.status(404).json({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `${request.method} ${request.path} bulunamadı.`,
      },
    });
  });

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      console.error(error);

      response.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Beklenmeyen bir sunucu hatası oluştu.",
        },
      });
    },
  );

  return app;
}
