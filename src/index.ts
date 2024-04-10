import "dotenv/config";
import { chalk, echo, question, $ } from "zx";
import { ToolCall, createThread, toRunableAssistant } from "./assistant.js";
import ora from "ora";
import OpenAI from "openai";
import { syncCachedAssistant } from "./storage/storage.repository.js";
import { never } from "./ts.utils.js";
import { toTerminal } from "./md.utils.js";
import { AssistantConfig } from "./assistant.utils.js";
import select from "@inquirer/select";
import baseAssistant from "./assistants/base-assistant.js";
import standardExecutor from "./assistants/standard-executor.js";

// Disable logging of stdout/stderr
$.verbose = false;

const ASSISTANTS = [standardExecutor, baseAssistant];
const DEFAULT_ASSISTANT = standardExecutor;
const assistantConfigs = new Map<string, AssistantConfig<any>>(
  ASSISTANTS.map((a) => [a.name, a]),
);

function displayToolCall(action: ToolCall) {
  return `${action.name} (${JSON.stringify(action.args)})`;
}

function displayToolCalls(actions: ToolCall[]) {
  return actions.map(displayToolCall).join(", ");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let assistant = await syncCachedAssistant(client, DEFAULT_ASSISTANT);
let runableAssistant = toRunableAssistant(
  assistant.remoteId,
  DEFAULT_ASSISTANT,
);

echo(
  chalk.yellow("\nUsing assistant: ") +
    `${assistant.name} - v${assistant.version} (${assistant.state})\n` +
    chalk.underline.yellowBright(
      `https://platform.openai.com/playground?mode=assistant&assistant=${assistant.remoteId}`,
    ),
);

const thread = await createThread(client, runableAssistant);
echo(
  chalk.bold.blue("\nAssistant: \n") +
    `
Hello, how can I help you?
Use /a to switch assistant
`.trim(),
);

while (true) {
  echo(chalk.bold.magenta("\nUser: "));
  const userInput = await question();

  // Switch assistant
  if (userInput === "/a") {
    const assistantName = await select({
      message: "Which assistant do you want to use?",
      choices: Array.from(assistantConfigs.values()).map((a) => ({
        name: a.name,
        value: a.name,
        description: a.description,
      })),
    });

    if (!assistantName || !assistantConfigs.has(assistantName)) {
      echo(chalk.red("Invalid assistant name"));
      continue;
    }

    const assistantConfig = assistantConfigs.get(assistantName)!;
    assistant = await syncCachedAssistant(client, assistantConfig);
    runableAssistant = toRunableAssistant(assistant.remoteId, assistantConfig);

    echo(
      chalk.yellow("\nUsing assistant: ") +
        `${assistant.name} - v${assistant.version} (${assistant.state})\n` +
        chalk.underline.yellowBright(
          `https://platform.openai.com/playground?mode=assistant&assistant=${assistant.remoteId}`,
        ),
    );

    continue;
  }

  // Respond
  echo(chalk.bold.blue("\nAssistant: "));
  const res = thread.sendMessage(userInput, runableAssistant);

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
        echo(toTerminal(status.message));
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
