import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "../../infra/migrations",
  dbCredentials: {
    url: process.env["DATABASE_ADMIN_URL"] ?? "postgresql://ssot_admin:ssot_local_dev@localhost:5432/ssot_contacts",
  },
});
