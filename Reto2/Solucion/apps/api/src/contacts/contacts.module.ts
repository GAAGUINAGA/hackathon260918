import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ContactsController } from "./contacts.controller.js";

/**
 * `AuthModule` es `@Global()`, pero `@UseGuards(JwtAuthGuard)` resuelve el
 * guard por referencia de clase a través del injector del módulo que
 * declara el controlador: importarlo explícitamente evita depender de que
 * la resolución global alcance ese caso (falla de forma no obvia si no se
 * importa, ver Fase 4 — regresión cubierta por los e2e).
 */
@Module({
  imports: [AuthModule],
  controllers: [ContactsController],
})
export class ContactsModule {}
