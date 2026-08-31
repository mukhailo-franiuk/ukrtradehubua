import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Весь менеджмент URL для міграцій тепер відбувається тут
    url: env("DATABASE_URL"),
  },
});
