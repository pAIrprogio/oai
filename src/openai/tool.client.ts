import { glob } from "zx";
import { ROOTDIR } from "../utils/node.utils.js";
import path from "path";
import {
  ErrorToolOutput,
  Tool,
  ToolOutput,
  toOpenAiTool,
} from "./tool.utils.js";
import { z } from "zod";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/index.mjs";
import { PromiseReturnType, PromiseValue } from "../utils/ts.utils.js";

class ToolNotFoundException extends Error {
  constructor(toolName: string) {
    super(`Tool ${toolName} not found`);
  }
}

class ToolWithoutDefaultExportException extends Error {
  constructor(toolName: string) {
    super(`Tool ${toolName} does not export a default function`);
  }
}

export async function getOpenAITool(toolName: string) {
  const tool = await getTool(toolName);
  return toOpenAiTool(tool);
}

export async function* getToolsNames() {
  const files = await glob("src/tools/*.ts", {
    cwd: ROOTDIR,
  });

  for await (const file of files) {
    yield path.basename(file, ".ts");
  }
}

export async function getTool(toolName: string): Promise<Tool> {
  const module = await import(`../tools/${toolName}.js`).catch((e) => {
    if (e instanceof Error && e.message.includes("Cannot find module")) {
      throw new ToolNotFoundException(toolName);
    }
    throw e;
  });
  if (!module.default) throw new ToolWithoutDefaultExportException(toolName);
  return module.default as Tool;
}

const defaultErrorFormater = (error: any): ErrorToolOutput => {
  if (typeof error === "string") return { success: false as const, error };
  if (error instanceof Error)
    return { success: false as const, error: error.message };

  return { success: false as const, error: JSON.stringify(error) };
};

export async function executeTool(
  toolName: string,
  _args: any,
): Promise<ToolOutput> {
  try {
    const tool = await getTool(toolName);
    const args = tool.argsSchema.parse(_args);
    const res = await tool.call(args);
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return {
        success: false,
        error: `Invalid arguments for tool ${toolName}`,
        output: e.format(),
      };
    }
    if (e instanceof ToolNotFoundException) {
      return { success: false, error: `Tool ${toolName} not found` };
    }
    if (e instanceof ToolWithoutDefaultExportException) {
      return {
        success: false,
        error: `Tool ${toolName} does not export a default function`,
      };
    }
    if (e instanceof Error) {
      return { success: false, error: e.message };
    }
    return defaultErrorFormater(e);
  }
}

type FunctionOnlyToolCall = RequiredActionFunctionToolCall & {
  type: "function";
};

export function executeToolCalls(calls: Array<RequiredActionFunctionToolCall>) {
  return calls
    .filter((call): call is FunctionOnlyToolCall => call.type === "function")
    .map((call) => ({
      id: call.id,
      name: call.function.name,
      args: JSON.parse(call.function.arguments),
    }))
    .map((call) =>
      executeTool(call.name, call.args).then((output) => ({
        toolId: call.id,
        toolName: call.name,
        args: call.args,
        output,
      })),
    );
}

export type ToolRunnerOutput = ReturnType<typeof executeToolCalls>;
