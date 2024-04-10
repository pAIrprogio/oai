import { writeFile as fsWriteFile } from "fs/promises";
import { ensureDir } from "fs-extra";
import { dirname } from "path";
import { Tool } from "../tool.utils.js";
import { z } from "zod";

const argsSchema = z.object({
  relativeFilePath: z
    .string()
    .describe("The path to the file relative to the project root"),
  content: z.string().describe("The content to write to the file"),
});

type Args = z.input<typeof argsSchema>;

export const writeFile = {
  name: "writeFile",
  description: "Write text to a file, replacing the current file's content",
  argsSchema,
  async call(args: Args) {
    await ensureDir(dirname(args.relativeFilePath));
    await fsWriteFile(args.relativeFilePath, args.content);
    return { success: true, output: null };
  },
} satisfies Tool<Args>;
