import { Global, Module } from "@nestjs/common";
import { loadEnv } from "./env.js";
import { ENV } from "./env.provider.js";

/**
 * `loadEnv()` se difiere a `useFactory` (evaluado cuando Nest instancia el
 * provider, dentro de `app.init()`) y nunca a `useValue` con una llamada
 * directa: esa forma se ejecuta en cuanto el decorador `@Module` corre, es
 * decir, al simplemente IMPORTAR este archivo — antes de que un test
 * pudiera fijar variables de entorno de prueba.
 */
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}
