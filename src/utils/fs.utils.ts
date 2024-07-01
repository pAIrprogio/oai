import { promises as fs } from "fs";
import { join } from "path";

export function readFile(path: string, cwd?: string) {
  const fullPath = cwd ? join(cwd, path) : path;
  return fs.readFile(fullPath, "utf-8").catch((e) => {
    if (e.code === "ENOENT") throw new Error("File does not exist");
    throw e;
  });
}
