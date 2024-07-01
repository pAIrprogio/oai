import { get_encoding } from "tiktoken";
import { readFile } from "./fs.utils.js";
import { glob } from "zx";

export function countTokens(text: string): number {
  const encoding = get_encoding("cl100k_base");
  const length = encoding.encode(text).length;
  encoding.free();
  return length;
}

export async function countFileToken(path: string, cwd?: string) {
  const content = await readFile(path, cwd);
  return countTokens(content);
}

export async function countGlobToken(globsString: string = "**/*") {
  const globs = globsString.split(",");
  const includes = globs.filter((g) => !g.startsWith("!"));
  const excludes = globs.filter((g) => g.startsWith("!"));

  const paths = await glob(includes, {
    ignore: excludes,
  });

  if (!paths) throw new Error("No files found");

  const sizes = await Promise.all(paths.map((path) => countFileToken(path)));
  return {
    filesCount: paths.length,
    tokensCount: sizes.reduce((acc, size) => acc + size, 0),
  };
}
