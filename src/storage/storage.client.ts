import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { join } from "path";
import * as schema from "./storage.schema.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { ROOTDIR } from "../node.utils.js";
import { existsSync, mkdirSync } from "fs";

const dataFolderPath = join(ROOTDIR, "data");
const dbPath = join(dataFolderPath, "./data.db");
const migrationsFolder = join(ROOTDIR, "drizzle");

if (!existsSync(dataFolderPath)) mkdirSync(dataFolderPath);

const sqlite = new Database(dbPath);
const _db = drizzle(sqlite, { schema });
await migrate(_db, { migrationsFolder });

export const db = _db;
