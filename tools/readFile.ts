import { readFile as fsReadFile } from "fs/promises";

/**
 * @description read a file
 */
export interface ReadFile {
  relativeFilePath: string;
  /**
   * @description Prefix each line with its line number. Use it for git patches
   * @default false
   */
  prefixWithLineNumbers?: boolean;
}

export async function readFile({
  relativeFilePath,
  prefixWithLineNumbers,
}: ReadFile) {
  const fileContent = await fsReadFile(relativeFilePath, "utf-8");

  if (prefixWithLineNumbers) {
    return fileContent
      .split("\n")
      .map((line, index) => `${index + 1}:${line}`)
      .join("\n");
  }

  return fileContent;
}
