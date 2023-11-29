import { $, ProcessOutput } from "zx";
import { writeFile as fsWriteFile, rm } from "fs/promises";

/**
 * @name applyGitPatch
 * @description Apply a git patch on a file
 * @ignore This tool is a WiP, export it to enable it
 */
interface ApplyGitPatch {
  relativeFilePath: string;
  /**
   * @description The valid git patch to apply, starting with @@ -X,X +Y,Y @@. Be carefull about extra newlines, they can break the patch. Make sure to matching the line numbers. Make sure to match the original tab spacing.
   */
  patchContent: string;
}

/**
 * @description Apply a git patch on a file
 */
export async function applyGitPatch({
  relativeFilePath,
  patchContent,
}: ApplyGitPatch) {
  let rest = patchContent.split("\n");
  let firstLine = "";
  let headerMatch: RegExpMatchArray | null = null;

  do {
    firstLine = rest.shift()!;
    headerMatch = firstLine.match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
  } while (!headerMatch && rest.length > 0);

  if (!headerMatch)
    return {
      success: false,
      error: "Invalid patch content, must start with @@ -X,X +Y,Y @@",
    };

  const [_all, rmStart, rmCount, addStart, addCount] = headerMatch;

  // Fix missing last line
  if (
    rmCount === "0" &&
    Number(addStart) - Number(rmStart) === 1 &&
    rest[0] !== "\n"
  )
    rest.unshift("\n");

  const fixedPatchContent = [firstLine, ...rest].join("\n");

  await fsWriteFile("./tmp.patch", fixedPatchContent);
  await $`patch --no-backup-if-mismatch ${relativeFilePath} ./tmp.patch`;
  await rm("./tmp.patch");
  return { success: true };
}
