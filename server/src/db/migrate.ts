import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(sql);

console.log("Schema applied.");
