import { Global, Module } from "@nestjs/common";
import type { Env } from "../config/env.js";
import { ENV } from "../config/env.provider.js";
import { DatabaseModule } from "../database/database.module.js";
import { createRemoteJwtVerifier } from "./jwt-verifier.js";
import { JWT_VERIFIER } from "./jwt-verifier.token.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: JWT_VERIFIER,
      useFactory: (env: Env) => createRemoteJwtVerifier(env.SUPABASE_JWKS_URL, env.SUPABASE_ISSUER, env.SUPABASE_AUDIENCE),
      inject: [ENV],
    },
    JwtAuthGuard,
  ],
  exports: [JWT_VERIFIER, JwtAuthGuard],
})
export class AuthModule {}
