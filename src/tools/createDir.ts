import { z } from "zod";
import { ensureDir } from "fs-extra";
import { Tool } from "../tool.utils.js";

const argsSchema = z.object({
  path: z.string(),
});

type Args = z.input<typeof argsSchema>;

export const createDir = {
  name: "createDir",
  description:
    "Creates a directory and its parent directories if they don't exist",
  argsSchema,
  async call(args: Args) {
    await ensureDir(args.path);
    return { success: true, output: null };
  },
} satisfies Tool<Args>;
