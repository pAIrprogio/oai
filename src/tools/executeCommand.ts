import { z } from "zod";
import { $ } from "zx";
import { Tool } from "../openai/tools.utils.js";

const argsSchema = z.object({
  command: z.string(),
  cwd: z
    .string()
    .optional()
    .describe(
      "relative path to the current directory to execute the command from",
    ),
});

type Args = z.input<typeof argsSchema>;

export default {
  name: "executeCommand",
  description: "Executes a command in a bash terminal",
  argsSchema,
  async call(args: Args) {
    // Split space but keep quoted strings together
    const argsArray = args.command.match(/"[^"]+"|\S+/g) || [];
    const res = await $`${argsArray}`;

    return {
      success: true,
      output: res.stdout,
    };
  },
} satisfies Tool<Args>;
