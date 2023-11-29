import OpenAI from "openai";
import { readFileSync } from "fs";
import { zip, map, toArray } from "iter-tools";
import toolsSchema from "./tools/definitions.json" assert { type: "json" };
import * as toolsFns from "./tools/index.js";
import { Run } from "openai/resources/beta/threads/runs/runs.mjs";
import { ProcessOutput, YAML } from "zx";

const defaultSystemPrompt = `You're a senior developer at GAFA. Your objective is to assist the user into planning and executing on development tasks.
When modifying files, read the file content with line numbers and use a git patch to apply the changes. Don't wait for confirmation before executing commands`;

const getConfig = () => {
  const configFile = readFileSync("./config.yml", "utf-8");
  const config = YAML.parse(configFile);

  const noTools = !config.tools;
  const toolsSet = new Set(config.tools);
  return {
    systemPrompt: config.systemPrompt ?? defaultSystemPrompt,
    tools: toolsSchema.allTools
      .filter((tool) => noTools || toolsSet.has(tool))
      .map((tool) => ({
        type: "function" as const,
        function: tool,
      })),
  };
};

const { systemPrompt, tools } = getConfig();
// #region openAIClient

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const assistant = await openai.beta.assistants.create({
  name: "pAIprog",
  model: "gpt-4-1106-preview",
  instructions: systemPrompt,
  tools,
});

const thread = await openai.beta.threads.create();

// #endregion

type ProcessingMessage =
  | {
      type: "queued";
    }
  | {
      type: "in_progress";
    }
  | {
      type: "cancelling";
    }
  | {
      type: "cancelled";
    }
  | {
      type: "failed";
      error: string;
    }
  | {
      type: "expired";
    }
  | {
      type: "executing_actions";
      tools: string[];
    }
  | {
      type: "executing_actions_failure";
    }
  | {
      type: "completed";
      message: string;
    };

export async function* message(text: string): AsyncIterable<ProcessingMessage> {
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: text,
  });

  let run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistant.id,
  });

  while (true) {
    if (
      run.status === "queued" ||
      run.status === "in_progress" ||
      run.status === "cancelling"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      yield { type: run.status };
      run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      continue;
    }

    if (run.status === "cancelled") {
      yield { type: "cancelled" };
      return;
    }

    if (run.status === "failed") {
      yield {
        type: "failed",
        error: run.last_error?.message ?? "Unknown Error",
      };
      return;
    }

    if (run.status === "expired") {
      yield { type: "expired" };
      return;
    }

    if (run.status === "requires_action") {
      const toolsNames =
        run.required_action?.submit_tool_outputs.tool_calls.map(
          (tool) => tool.function.name,
        ) ?? [];
      yield { type: "executing_actions", tools: toolsNames };
      const [newRun, isSuccess] = await executeFunctions(run);
      if (!isSuccess) yield { type: "executing_actions_failure" };
      run = newRun;
    }

    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data[0].content[0];

      if (lastMessage.type === "text") {
        // TODO: add annotations
        yield { type: "completed", message: lastMessage.text.value };
        return;
      }
    }
  }
}

const executeFunctions = async (run: Run) => {
  if (!run.required_action) {
    throw new Error("Empty tool function to execute");
  }

  if (run.required_action.type !== "submit_tool_outputs") {
    throw new Error("Unsupported tool function, check your schema");
  }

  const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

  const outputPromises = toolCalls.map((toolCall) => {
    if (toolCall.type !== "function") {
      return { success: false, error: "Unsupported tool call type" };
    }

    const functionName = toolCall.function.name as Exclude<
      keyof typeof toolsSchema,
      "allTools"
    >;
    const functionArguments = JSON.parse(toolCall.function.arguments);
    const fn = toolsFns[functionName];

    if (!fn)
      return {
        success: false,
        error: `Unsupported tool function ${functionName}`,
      };

    const output = fn(functionArguments).catch(errorFormater);

    return output;
  });

  const allOutputsPromise = Promise.all(outputPromises);

  const outputs = await allOutputsPromise;

  const toolsOutput = map(
    ([toolCall, output]) => {
      return {
        tool_call_id: toolCall.id,
        output: JSON.stringify(output ?? { success: true }),
      };
    },
    zip(toolCalls, outputs),
  );

  const isSuccess = outputs.every(
    (output) => !(output instanceof Object) || output.success,
  );

  const newRun = await openai.beta.threads.runs.submitToolOutputs(
    thread.id,
    run.id,
    {
      tool_outputs: toArray(toolsOutput),
    },
  );

  return [newRun, isSuccess] as const;
};

const errorFormater = (error: any) => {
  if (typeof error === "string") return { success: false, error };
  if (error instanceof Error) return { success: false, error: error.message };
  if (error instanceof ProcessOutput)
    return { success: false, error: error.stderr };

  return { success: false, error: error };
};
