import { promises as fs } from "fs";

/**
 * @description Appends content to the specified file.
 */
export interface AppendToFile {
  /**
   * @description The path to the file relative to the project root
   */
  relativeFilePath: string;
  /**
   * @description The content to append to the file.
   */
  content: string;
}

export async function appendToFile(
  args: AppendToFile,
): Promise<{ success: boolean; error?: string }> {
  await fs.appendFile(args.relativeFilePath, args.content);
  return { success: true };
}
