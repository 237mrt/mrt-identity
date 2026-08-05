import { createApp } from "./app.js";

import { identity } from "./identity.js";

const DEFAULT_PORT = 3000;

function resolvePort(): number {
  const rawPort = process.env.PORT;

  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new TypeError("PORT geçerli bir port numarası olmalıdır.");
  }

  return port;
}

async function startServer(): Promise<void> {
  await identity.start();

  const app = createApp();
  const port = resolvePort();

  const server = app.listen(port, () => {
    console.log(
      `mrt-identity Express örneği http://localhost:${port} adresinde çalışıyor.`,
    );
  });

  async function shutdown(signal: string): Promise<void> {
    console.log(`\n${signal} alındı. Sunucu kapatılıyor.`);

    server.close(async (error) => {
      if (error) {
        console.error("Sunucu kapatılırken hata oluştu:", error);

        process.exitCode = 1;
        return;
      }

      await identity.adapter?.disconnect?.();

      process.exitCode = 0;
    });
  }

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

startServer().catch((error) => {
  console.error("Sunucu başlatılamadı:", error);

  process.exitCode = 1;
});
