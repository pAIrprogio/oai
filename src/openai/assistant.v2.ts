import OpenAI from "openai";
import { AssistantConfig } from "./assistant.utils.js";
import {
  ErrorToolOutput,
  Tool,
  toOpenAiTools,
  toToolsMap,
} from "../tool.utils.js";
import { Subject } from "rxjs";
import { throwOnUnhandled } from "../ts.utils.js";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/index.mjs";

type PromiseValue<T> = T extends Promise<infer U> ? U : never;

const defaultErrorFormater = (error: any): ErrorToolOutput => {
  if (typeof error === "string") return { success: false as const, error };
  if (error instanceof Error)
    return { success: false as const, error: error.message };

  return { success: false as const, error: JSON.stringify(error) };
};

type ErrorFormaterFn = typeof defaultErrorFormater;

const toolRunnerFactory = <T extends Array<Tool>>(
  assistantConfig: AssistantConfig<T>,
  errorFormater: ErrorFormaterFn = defaultErrorFormater,
) => {
  const toolsSchema = toOpenAiTools(assistantConfig.tools);
  const toolsMap = toToolsMap(assistantConfig.tools);

  return (toolCalls: Array<RequiredActionFunctionToolCall>) => {
    // TODO: switch to serial execution
    return toolCalls.map((toolCall) => {
      if (toolCall.type !== "function") {
        return {
          toolId: toolCall.id,
          toolName: toolCall.function.name,
          output: {
            toolName: toolCall.function.name,
            success: false,
            error: "Unsupported tool call type",
          },
        };
      }

      const functionName = toolCall.function.name as keyof typeof toolsSchema;

      const tool = toolsMap[functionName as string];

      if (!tool)
        return {
          toolId: toolCall.id,
          toolName: toolCall.function.name,
          output: {
            success: false,
            error: `Unsupported tool function ${functionName as string}`,
          },
        };

      const functionArguments = tool.argsSchema.safeParse(
        JSON.parse(toolCall.function.arguments),
      );

      if (!functionArguments.success) {
        return {
          toolId: toolCall.id,
          toolName: toolCall.function.name,
          output: {
            success: false,
            error: `Invalid arguments for function ${functionName as string}`,
            argErrors: functionArguments.error.format(),
          },
        };
      }

      return tool
        .call(functionArguments.data)
        .then((output) => ({
          toolId: toolCall.id,
          toolName: toolCall.function.name,
          output: output,
        }))
        .catch((err) => ({
          toolId: toolCall.id,
          toolName: toolCall.function.name,
          output: errorFormater(err),
        }));
    });
  };
};

export type ToolRunner = ReturnType<typeof toolRunnerFactory>;
export type ToolRunnerOutput = ReturnType<ToolRunner>;

export const toRunableAssistant = (
  assistantId: string,
  assistantConfig: AssistantConfig,
) => {
  const toolRunner = toolRunnerFactory(assistantConfig);
  return {
    id: assistantId,
    toolRunner,
    config: assistantConfig,
  };
};

export type RunableAssistant = ReturnType<typeof toRunableAssistant>;

export interface ToolCall {
  id: string;
  name: string;
  args: any;
}

type UserInput =
  | {
      type: "message";
      content: string;
      assistant?: RunableAssistant;
    }
  | { type: "abort" };

type AssistantResponse =
  | { type: "responseStart" } // Thinking
  | { type: "stepStart" }
  //
  | { type: "functionCallStart"; id: string; name: string }
  | { type: "functionCallDelta"; argsDelta: string }
  | { type: "functionCallDone"; id: string; output: string }
  | {
      type: "functionCallExecuted";
      toolId: string;
      toolName: string;
      output: { success: boolean };
    }
  //
  | { type: "textStart" }
  | { type: "textDelta"; content: string }
  | { type: "textEnd" }
  //
  | { type: "stepEnd" }
  | { type: "responseEnd" }
  // Errors
  | { type: "responseAbort" }
  | { type: "error"; message: string }
  // Tokens
  | {
      type: "tokensUsage";
      tokens: {
        prompt?: number;
        completion?: number;
      };
    };

export async function createThread(
  openAIClient: OpenAI,
  threadAssistant: RunableAssistant,
) {
  const userInput$ = new Subject<UserInput>();
  const assistantResponses$ = new Subject<AssistantResponse>();
  const openAIThread = await openAIClient.beta.threads.create({});
  let runableAssistant = threadAssistant;
  let streamId: string | null = null;
  let stream: ReturnType<typeof openAIClient.beta.threads.runs.stream> | null =
    null;
  let toolCallsPromises: ToolRunnerOutput = [];

  type OpenAIStream = ReturnType<typeof openAIClient.beta.threads.runs.stream>;

  const sendMessage = async (text: string) => {
    userInput$.next({ type: "message", content: text });
  };

  const abortCompletion = () => {
    userInput$.next({ type: "abort" });
  };

  const addStreamListeners = (
    stream: ReturnType<typeof openAIClient.beta.threads.runs.stream>,
  ) => {
    stream.on("abort", () => {
      assistantResponses$.next({ type: "responseAbort" });
    });
    stream.on("connect", () => {
      toolCallsPromises = [];
      assistantResponses$.next({ type: "responseStart" });
    });
    stream.on("end", () => {
      if (toolCallsPromises.length === 0) {
        assistantResponses$.next({ type: "responseEnd" });
        return;
      }

      Promise.all(toolCallsPromises).then((toolCallsOutputs) => {
        for (let toolCallOutput of toolCallsOutputs) {
          assistantResponses$.next({
            type: "functionCallExecuted",
            ...toolCallOutput,
          });
        }

        stream = openAIClient.beta.threads.runs.submitToolOutputsStream(
          openAIThread.id,
          stream.currentRun()!.id,
          {
            tool_outputs: toolCallsOutputs.map((response) => ({
              tool_call_id: response.toolId,
              output: JSON.stringify(response.output),
            })),
          },
        );
        addStreamListeners(stream);
        addToolsHandler(stream);
      });
    });
    stream.on("error", (data) => {
      assistantResponses$.next({ type: "error", message: data.message });
    });
    stream.on("imageFileDone", (data) => {
      // TODO: An image file has been rendered
    });
    stream.on("runStepCreated", (data) => {
      assistantResponses$.next({ type: "stepStart" });
    });
    stream.on("runStepDone", (data) => {
      assistantResponses$.next({ type: "stepEnd" });
      assistantResponses$.next({
        type: "tokensUsage",
        tokens: {
          prompt: data.usage?.prompt_tokens,
          completion: data.usage?.completion_tokens,
        },
      });
    });
    stream.on("textCreated", (data) => {
      assistantResponses$.next({ type: "textStart" });
    });
    stream.on("textDelta", (data, snap) => {
      assistantResponses$.next({
        type: "textDelta",
        content: data.value ?? "",
      });
    });
    stream.on("textDone", (data) => {
      assistantResponses$.next({ type: "textEnd" });
    });
    // TODO
    stream.on("toolCallCreated", (data) => {
      if (data.type === "function") {
        assistantResponses$.next({
          type: "functionCallStart",
          id: data.id,
          name: data.function.name,
        });
        return;
      }

      if (data.type === "file_search") {
        // TODO
        return;
      }

      if (data.type === "code_interpreter") {
        // TODO
        return;
      }

      return throwOnUnhandled(data, "Unknown tool call type");
    });
    stream.on("toolCallDelta", (data, snap) => {
      if (data.type === "function") {
        assistantResponses$.next({
          type: "functionCallDelta",
          argsDelta: data.function?.arguments ?? "",
        });
        return;
      }

      if (data.type === "file_search") {
        // TODO
        return;
      }

      if (data.type === "code_interpreter") {
        // TODO
        return;
      }

      return throwOnUnhandled(data, "Unknown tool call type");
    });
    stream.on("toolCallDone", (data) => {
      if (data.type === "function") {
        assistantResponses$.next({
          type: "functionCallDone",
          id: data.id,
          output: data.function?.output ?? "",
        });
        return;
      }

      if (data.type === "file_search") {
        // TODO
        return;
      }

      if (data.type === "code_interpreter") {
        // TODO
        return;
      }

      return throwOnUnhandled(data, "Unknown tool call type");
    });
  };

  const addToolsHandler = (stream: OpenAIStream) => {
    stream.on("event", async ({ data, event }) => {
      if (
        event === "thread.run.requires_action" &&
        data.required_action?.submit_tool_outputs.tool_calls
      ) {
        const toolCalls =
          data.required_action.submit_tool_outputs.tool_calls.filter(
            (tool): tool is RequiredActionFunctionToolCall =>
              tool.type === "function",
          );

        toolCallsPromises = runableAssistant.toolRunner(toolCalls);
      }
    });
  };

  userInput$.subscribe((event) => {
    if (event.type === "abort") {
      stream?.abort();
      return;
    }

    if (event.type === "message") {
      if (event.assistant) runableAssistant = event.assistant;
      stream = openAIClient.beta.threads.runs.stream(openAIThread.id, {
        assistant_id: runableAssistant.id,
        additional_messages: [
          {
            role: "user",
            content: event.content,
          },
        ],
      });
      addStreamListeners(stream);
      addToolsHandler(stream);
      return;
    }

    throwOnUnhandled(event, "Unsupported event type");
  });

  return {
    openAIThread,
    assistantResponses$,
    sendMessage,
    abortCompletion,
  };
}

export type Thread = PromiseValue<ReturnType<typeof createThread>>;
