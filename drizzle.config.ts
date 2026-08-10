import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "packages/persistence/src/schema.ts",
  out: "packages/persistence/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://cvg:cvg@localhost:5432/cvg",
  },
  strict: true,
  verbose: true,
});
