import OpenAI from "openai";
import { Subject } from "rxjs";
import { throwOnUnhandled } from "../utils/ts.utils.js";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/index.mjs";
import { ParsedAssistant } from "./assistant.client.js";
import { ToolRunnerOutput, executeToolCalls } from "./tool.client.js";

type PromiseValue<T> = T extends Promise<infer U> ? U : never;

type UserInput =
  | {
      type: "message";
      content: string;
      assistant?: ParsedAssistant;
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
      args: any;
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
  assistant: ParsedAssistant,
) {
  const userInput$ = new Subject<UserInput>();
  const assistantResponses$ = new Subject<AssistantResponse>();
  const openAIThread = await openAIClient.beta.threads.create({});

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

        toolCallsPromises = executeToolCalls(toolCalls);
      }
    });
  };

  userInput$.subscribe((event) => {
    if (event.type === "abort") {
      stream?.abort();
      return;
    }

    if (event.type === "message") {
      if (event.assistant) assistant = event.assistant;
      stream = openAIClient.beta.threads.runs.stream(openAIThread.id, {
        assistant_id: assistant.id,
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
