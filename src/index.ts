import "dotenv/config";
import { chalk, echo, question, $ } from "zx";
import { ToolCall, createAssistant, createThread } from "./assistant.js";
import ora from "ora";
import OpenAI from "openai";
import baseAssistant from "./assistants/baseAssistant.js";

// Disable logging of stdout/stderr
$.verbose = false;

function displayToolCall(action: ToolCall) {
  return `${action.name} (${JSON.stringify(action.args)})`;
}

function displayToolCalls(actions: ToolCall[]) {
  return actions.map(displayToolCall).join(", ");
}

// Prevent forgetting case in switch statements
const never = (input: never) => {};
echo(chalk.bold.blue("Assistant: ") + "Hello, how can I help you?");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const assistant = await createAssistant(baseAssistant, {
  openAIClient: client,
});

const thread = await createThread({
  assistant,
  openAIClient: client,
});

while (true) {
  const userInput = await question(chalk.bold.magenta("User: "));
  const res = thread.sendMessage(userInput, assistant);

  let currentSpinner = ora({
    text: "Waiting",
    color: "blue",
  }).start();
  let previousToolCalls = null;

  // Grab the interrupt function
  let interrupt: (() => Promise<void>) | null = null;
  // TODO: Find a way to use it

  for await (let status of res) {
    switch (status.type) {
      case "message_sent":
        break;
      case "executing_tools_done":
        previousToolCalls = null;
        status.isSuccess ? currentSpinner.succeed() : currentSpinner.fail();
        currentSpinner = ora({
          text: "Waiting",
          color: "cyan",
        }).start();
        break;
      case "executing_tools":
        const toolCalls = displayToolCalls(status.tools);

        if (previousToolCalls && toolCalls !== previousToolCalls) {
          currentSpinner.color = "green";
          currentSpinner.succeed();
          currentSpinner = ora({
            text: "Executing tools: " + toolCalls,
            color: "cyan",
          }).start();
        } else {
          currentSpinner.text = "Executing tools: " + toolCalls;
        }

        previousToolCalls = toolCalls;
        break;

      case "completed":
        currentSpinner.color = "green";
        currentSpinner.stop();
        echo(chalk.bold.blue("Assistant: "), status.message);
        break;

      case "failed":
        currentSpinner.color = "red";
        currentSpinner.fail("Failed");
        echo(chalk.red(status.error));
        break;

      case "cancelled":
        currentSpinner.color = "yellow";
        currentSpinner.fail("Cancelled");
        break;

      case "expired":
        currentSpinner.color = "red";
        currentSpinner.fail("Expired");
        break;

      case "queued":
        currentSpinner.color = "cyan";
        currentSpinner.text = "Waiting";
        break;

      case "in_progress":
        currentSpinner.color = "blue";
        currentSpinner.text = "Thinking";
        break;

      case "cancelling":
        currentSpinner.color = "yellow";
        currentSpinner.text = "Cancelling";
        break;

      default:
        never(status);
    }
  }

  if (interrupt) process.off("SIGINT", interrupt);
}
