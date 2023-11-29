import { $, ProcessOutput } from "zx";

/**
 * @description List a directory's files
 */
export interface Ls {
  /**
   * @description relative path to the directory
   * @default "." (workspace root)
   */
  relativePath: string;
}

export async function ls({ relativePath }: Ls) {
  const res =
    await $`(git ls-files ${relativePath}; git ls-files -m  ${relativePath}; git ls-files --others --exclude-standard  ${relativePath}) | sort | uniq`;
  return res.stdout.trim();
}
