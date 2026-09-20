import { Module } from "@nestjs/common";
import { JwtVerifier } from "../auth/jwt-verifier.js";
import { JWT_VERIFIER } from "../auth/jwt-verifier.token.js";
import { SyncProgressGateway } from "./sync-progress.gateway.js";

@Module({
  providers: [
    {
      provide: SyncProgressGateway,
      useFactory: (verifier: JwtVerifier) => new SyncProgressGateway(verifier),
      inject: [JWT_VERIFIER],
    },
  ],
  exports: [SyncProgressGateway],
})
export class WebSocketModule {}
