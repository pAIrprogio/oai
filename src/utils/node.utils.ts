import { fileURLToPath } from "url";
import { dirname, join } from "path";

export const toDirname = (url: string) => dirname(fileURLToPath(url));

export const ROOTDIR = join(toDirname(import.meta.url), "../..");

export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async <T>(fn: () => Promise<T>, retries: number) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) {
        throw error; // Rethrow error if last attempt fails
      }
      return await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
    }
  }
};
