import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { WorkerModule } from "./worker.module.js";

/**
 * Anillo 3 - Worker (NestJS standalone) + relé transaccional del Outbox
 * (LISTEN/NOTIFY + sondeo adaptativo, RT-04 §4.2). Sin servidor HTTP: un
 * contexto de aplicación de Nest basta para el ciclo de vida
 * (`onModuleInit`/`onModuleDestroy`) que arranca y detiene el relé.
 */
export const RING = "A3-worker" as const;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["error", "warn", "log"],
  });

  const shutdown = async (): Promise<void> => {
    await app.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());

  Logger.log("Worker listo.", "Bootstrap");
}

if (process.argv[1]?.endsWith("main.js") === true || process.argv[1]?.endsWith("main.ts") === true) {
  void bootstrap();
}
