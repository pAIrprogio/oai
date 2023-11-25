import { writeFile as fsWriteFile, access } from "fs/promises";

/**
 * @description Write text to a file, replacing the current file's content
 */
export interface WriteFile {
  relativeFilePath: string;
  content: string;
}

export async function writeFile({ relativeFilePath, content }: WriteFile) {
  try {
    await fsWriteFile(relativeFilePath, content);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
  }
}
