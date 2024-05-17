import { z } from "zod";
import { $ } from "zx";
import { Tool } from "../openai/tool.utils.js";

const argsSchema = z.object({
  message: z.string(),
});

type Args = z.input<typeof argsSchema>;

export default {
  name: "commit",
  description: "Adds and commits all changes to the current git repository",
  argsSchema,
  async call(args: Args) {
    await $`git add . && git commit -m "${args.message}"`;
    return { success: true, output: null };
  },
} satisfies Tool<Args>;
