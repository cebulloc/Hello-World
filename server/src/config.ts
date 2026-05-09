import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl:
    process.env.DATABASE_URL ?? path.resolve(__dirname, "../data/dev.sqlite"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
  rootDir: path.resolve(__dirname, ".."),
} as const;
