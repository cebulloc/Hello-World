import fs from "node:fs";
import { config } from "../config.js";

if (fs.existsSync(config.databaseUrl)) {
  fs.rmSync(config.databaseUrl);
  console.log(`Removed ${config.databaseUrl}`);
}

await import("./migrate.js");
await import("./seed.js");
