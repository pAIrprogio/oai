import OpenAI from "openai";
import { readFileSync } from "fs";
import { zip, map, toArray } from "iter-tools";
import toolsSchema from "./tools/definitions.json" assert { type: "json" };
import * as toolsFns from "./tools/index.js";
import { ProcessOutput, YAML } from "zx";

const defaultSystemPrompt = `You're a senior developer at GAFA. Your objective is to assist the user into planning and executing on development tasks.
When modifying files, read the file content with line numbers and use a git patch to apply the changes. Don't wait for confirmation before executing commands`;

const getConfig = () => {
  const config = {
    systemPrompt: defaultSystemPrompt,
    tools: toolsSchema.allTools.map((tool) => ({
      type: "function" as const,
      function: tool,
    })),
  };

  try {
    var configFile = readFileSync("./ai.config.yml", "utf-8");
  } catch (error) {
    return config;
  }

  const yamlConfig = YAML.parse(configFile);

  if (yamlConfig.systemPrompt) config.systemPrompt = yamlConfig.systemPrompt;

  if (yamlConfig.tools) {
    const toolsSet = new Set(yamlConfig.tools);
    config.tools = config.tools.filter((tool) =>
      toolsSet.has(tool.function.name),
    );
  }

  return config;
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

export async function* message(text: string) {
  let run: OpenAI.Beta.Threads.Runs.Run;
  let isInterrupted = false;

  const interrupt = async () => {
    isInterrupted = true;
    if (!run) return;
    await openai.beta.threads.runs.cancel(thread.id, run.id).catch(() => {
      // Ignore error when trying to cancel a cancelled or completed run
    });
  };

  yield { type: "interruptFn" as const, interrupt };

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: text,
  });

  run = await openai.beta.threads.runs.create(thread.id, {
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
      yield { type: "cancelled" as const };
      return;
    }

    if (run.status === "failed") {
      yield {
        type: "failed" as const,
        error: run.last_error?.message ?? "Unknown Error",
      };
      return;
    }

    if (run.status === "expired") {
      yield { type: "expired" as const };
      return;
    }

    if (run.status === "requires_action") {
      const toolsNames =
        run.required_action?.submit_tool_outputs.tool_calls.map(
          (tool) => tool.function.name,
        ) ?? [];
      yield { type: "executing_actions" as const, tools: toolsNames };
      try {
        const [newRun, isSuccess] = await executeFunctions(run);
        if (!isSuccess) yield { type: "executing_actions_failure" as const };
        run = newRun;
      } catch (error) {
        // Recover from error when trying to send tool outputs on a cancelled run
        if (isInterrupted) continue;
        throw error;
      }
    }

    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(thread.id);
      const lastMessage = messages.data[0].content[0];

      if (lastMessage.type === "text") {
        // TODO: add annotations
        yield { type: "completed" as const, message: lastMessage.text.value };
        return;
      }
    }
  }
}

const executeFunctions = async (run: OpenAI.Beta.Threads.Runs.Run) => {
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
