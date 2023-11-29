import { $, ProcessOutput } from "zx";

/**
 * @description Executes a command in a bash terminal
 */
export interface ExecuteCommand {
  command: string;
}

export async function executeCommand(args: ExecuteCommand) {
  const argsArray = args.command.split(" ");
  const res = await $`${argsArray}`;

  return {
    success: true,
    output: res.stdout,
  };
}
