import { readFile as fsReadFile } from "fs/promises";
import { z } from "zod";
import { Tool } from "../openai/tool.utils.js";
import { $ } from "zx";

const argsSchema = z.object({
  relativeFilePath: z
    .string()
    .describe("The path to the file relative to the project root"),
});

type Args = z.input<typeof argsSchema>;

export default {
  name: "fileDiff",
  description: "Reads the current diffs of a file",
  argsSchema,
  async call(args: Args) {
    let diff = await $`git --no-pager diff ${args.relativeFilePath}`;

    return {
      success: true,
      output: diff,
    };
  },
} satisfies Tool<Args>;
