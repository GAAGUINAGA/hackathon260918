import { ClassSerializerInterceptor, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module.js";
import { ConfigModule } from "./config/config.module.js";
import { ENV } from "./config/env.provider.js";
import type { Env } from "./config/env.js";
import { SanitizedExceptionFilter } from "./common/sanitized-exception.filter.js";
import { ContactsModule } from "./contacts/contacts.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { WebSocketModule } from "./websocket/websocket.module.js";

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    // RT-09: limitación de tasa por usuario/IP. Fastify ya resuelve la IP
    // del cliente; el throttler la usa como clave por defecto.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [{ ttl: env.RATE_LIMIT_TTL_MS, limit: env.RATE_LIMIT_LIMIT }],
      }),
    }),
    ContactsModule,
    WebSocketModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: SanitizedExceptionFilter },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) => new ClassSerializerInterceptor(reflector, { excludeExtraneousValues: true }),
      inject: [Reflector],
    },
  ],
})
export class AppModule {}
