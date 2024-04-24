import { fileURLToPath } from "url";
import { dirname, join } from "path";

export const toDirname = (url: string) => dirname(fileURLToPath(url));

export const ROOTDIR = join(toDirname(import.meta.url), "..");

export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
