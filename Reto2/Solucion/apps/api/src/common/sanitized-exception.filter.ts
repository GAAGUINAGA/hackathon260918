import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { FastifyReply } from "fastify";

/**
 * RT-07: logs, trazas y errores nunca contienen correos, teléfonos,
 * direcciones ni tokens. Un error no controlado se registra con un
 * `trace_id` correlacionable server-side; el cliente solo recibe un 500
 * genérico con ese id, nunca el mensaje ni la traza interna.
 */
@Catch()
export class SanitizedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("UnhandledException");

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      reply.status(exception.getStatus()).send(exception.getResponse());
      return;
    }

    const traceId = randomUUID();
    this.logger.error(`traceId=${traceId} ${exception instanceof Error ? exception.stack : String(exception)}`);
    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      code: "internal_error",
      message: "Ocurrió un error inesperado.",
      traceId,
    });
  }
}
