import { Injectable, Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { JwtVerificationError, JwtVerifier } from "../auth/jwt-verifier.js";

/**
 * ADR-06: progreso de trabajos largos por WebSocket, autenticado en el
 * handshake (nunca tras la conexión). El estado permanece consultable por
 * `GET /v1/jobs/:id` (sondeo de respaldo) — ese endpoint llega junto con
 * UC-19, que aún no tiene casos de uso que produzcan progreso real; este
 * gateway deja lista la autenticación y la sala por propietario para
 * cuando los haya.
 */
export interface JobProgressEvent {
  readonly jobId: string;
  readonly status: string;
  readonly progress?: Record<string, unknown>;
}

function ownerRoom(ownerId: string): string {
  return `owner:${ownerId}`;
}

@Injectable()
@WebSocketGateway({ namespace: "/v1/ws", cors: false })
export class SyncProgressGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SyncProgressGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly verifier: JwtVerifier) {}

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const token = extractToken(client);
    if (token === null) {
      client.disconnect(true);
      return;
    }

    try {
      const claims = await this.verifier.verify(token);
      await client.join(ownerRoom(claims.sub));
      client.data["ownerId"] = claims.sub;
    } catch (error) {
      if (error instanceof JwtVerificationError) {
        client.disconnect(true);
        return;
      }
      throw error;
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`client disconnected: ${String(client.id)}`);
  }

  /** Emisión agregada por propietario (ADR-06): nunca a un socket suelto sin acotar. */
  emitJobProgress(ownerId: string, event: JobProgressEvent): void {
    this.server.to(ownerRoom(ownerId)).emit("job:progress", event);
  }
}

function extractToken(client: Socket): string | null {
  const authToken = client.handshake.auth["token"];
  if (typeof authToken === "string" && authToken.length > 0) {
    return authToken;
  }
  const header = client.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return null;
}
