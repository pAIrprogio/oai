import { writeFile as fsWriteFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

/**
 * @description Write text to a file, replacing the current file's content
 */
export interface WriteFile {
  relativeFilePath: string;
  content: string;
}

export async function writeFile({ relativeFilePath, content }: WriteFile) {
  const directory = dirname(relativeFilePath);
  await mkdir(directory, { recursive: true }).catch(error => {
    if (error.code !== 'EEXIST') throw error // ignore the error if the directory already exists
  });
  await fsWriteFile(relativeFilePath, content);
  return { success: true };
}
