import { $, ProcessOutput } from "zx";

/**
 * @description Executes a command in a bash terminal
 */
export interface ExecuteCommand {
  command: string;
}

export async function executeCommand(args: ExecuteCommand) {
  // Split space but keep quoted strings together
  const argsArray = args.command.match(/"[^"]+"|\S+/g) || [];
  const res = await $`${argsArray}`;

  return {
    success: true,
    output: res.stdout,
  };
}
