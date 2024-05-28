import OpenAI from "openai";
import ora, { Ora } from "ora";
import { lastValueFrom } from "rxjs";
import { $, chalk, echo, question } from "zx";
import { createThread } from "../openai/thread.client.js";
import { deleteLastTextFromTerminal } from "../utils/cli.utils.js";
import { throwOnUnhandled } from "../utils/ts.utils.js";
import { promptAssistantSelection } from "./assistant/assistant.utils.js";
import { mdToTerminal } from "./md.utils.js";

$.verbose = false;

async function promptUserMessage() {
  newLine();
  echo(chalk.bold.magenta("User: "));
  newLine();
  const userInput = await question();
  newLine();
  return userInput;
}

function newLine() {
  echo("");
}

export async function appAction() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let assistantSpinner: Ora | null = null;

  const assistant = await promptAssistantSelection();
  const thread = await createThread(client, assistant);
  let bufferedText = "";
  thread.assistantResponses$.subscribe((response) => {
    if (response.type === "responseStart") {
      return;
    }

    if (response.type === "responseEnd") {
      promptUserMessage().then((userInput) => {
        echo(chalk.bold.blue("Assistant:"));
        newLine();
        assistantSpinner = ora({
          text: "Thinking",
          color: "blue",
        }).start();
        thread.sendMessage(userInput);
      });
      return;
    }

    if (response.type === "stepStart") {
      assistantSpinner?.stop();
      return;
    }

    if (response.type === "stepEnd") {
      return;
    }

    if (response.type === "error") {
      return;
    }

    if (response.type === "responseAbort") {
      return;
    }

    if (response.type === "tokensUsage") {
      return;
    }

    if (response.type === "textStart") {
      newLine();
      bufferedText = "";
      return;
    }

    if (response.type === "textDelta") {
      process.stdout.write(response.content);
      bufferedText += response.content;
      return;
    }

    if (response.type === "textEnd") {
      // TODO: Format text to markdown
      newLine();
      // deleteLastTextFromTerminal(bufferedText);
      // echo(mdToTerminal(bufferedText));
      return;
    }

    if (response.type === "functionCallStart") {
      newLine();
      console.write(
        chalk.cyan("Executing " + chalk.bold(response.name) + " with args: "),
      );
      return;
    }

    if (response.type === "functionCallDelta") {
      console.write(chalk.cyan(response.argsDelta));
      return;
    }

    if (response.type === "functionCallDone") {
      newLine();
      return;
    }

    if (response.type === "functionCallExecuted") {
      newLine();
      if (response.output.success) {
        echo(
          chalk.green(
            "✔ Successfully executed " + chalk.bold(response.toolName),
          ),
        );
      } else {
        echo(
          chalk.red("✖ Failed to execute " + chalk.bold(response.toolName)),
        );
        // @ts-ignore
        echo(chalk.red(response.output.error));
      }
      return;
    }

    throwOnUnhandled(response, "Unhandled response");
  });

  // First user message
  promptUserMessage().then((userInput) => {
    echo(chalk.bold.blue("Assistant:"));
    assistantSpinner = ora({
      text: "Thinking",
      color: "blue",
    }).start();
    thread.sendMessage(userInput);
  });
  return lastValueFrom(thread.assistantResponses$);
}
