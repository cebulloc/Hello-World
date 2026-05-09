import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";

const dir = path.dirname(config.databaseUrl);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(config.databaseUrl);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export type DB = typeof db;
