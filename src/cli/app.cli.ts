import { $, chalk, echo, glob, question } from "zx";
import { toDirname } from "../node.utils.js";
import { AssistantConfig } from "../assistant.utils.js";
import { select } from "@inquirer/prompts";
import OpenAI from "openai";
import { syncCachedAssistant } from "../storage/storage.repository.js";
import { toRunableAssistant, createThread } from "../assistant.v2.js";
import { throwOnUnhandled } from "../ts.utils.js";
import ora, { Ora } from "ora";
import { lastValueFrom } from "rxjs";

$.verbose = false;

interface AssistantConfigs {
  [key: string]: AssistantConfig;
}

async function promptUserMessage() {
  newLine();
  echo(chalk.bold.magenta("User: "));
  newLine();
  const userInput = await question();
  newLine();
  return userInput;
}

async function switchAssistant(
  client: OpenAI,
  assistantConfigs: AssistantConfigs,
) {
  const assistantName = await select({
    message: "Which assistant do you want to use?",
    choices: Array.from(Object.values(assistantConfigs)).map((a) => ({
      name: a.name,
      value: a.name,
      description: a.description,
    })),
  });

  const assistantConfig = assistantConfigs[assistantName];
  const remoteAssistant = await syncCachedAssistant(client, assistantConfig);

  echo(
    chalk.yellow("\nUsing assistant: ") +
      `${remoteAssistant.name} - v${remoteAssistant.version} (${remoteAssistant.state})\n` +
      chalk.underline.yellowBright(
        `https://platform.openai.com/playground?mode=assistant&assistant=${remoteAssistant.remoteId}`,
      ),
  );

  return toRunableAssistant(remoteAssistant.remoteId, assistantConfig);
}

async function getAssistantConfigs() {
  const assistantFiles = await glob.globby("../assistants/*.ts", {
    cwd: toDirname(import.meta.url),
  });

  let assistants = await Promise.all(
    assistantFiles.map(async (file) => {
      const module = await import(file);
      return module.default as AssistantConfig;
    }),
  );

  return assistants.reduce(
    (acc, assistant) => ({
      ...acc,
      [assistant.name]: assistant,
    }),
    {},
  );
}

function newLine() {
  echo("");
}

export async function appAction() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const assistants = await getAssistantConfigs();
  const runableAssistant = await switchAssistant(client, assistants);
  let assistantSpinner: Ora | null = null;

  const thread = await createThread(client, runableAssistant);
  thread.assistantResponses$.subscribe((response) => {
    if (response.type === "responseStart") {
      return;
    }

    if (response.type === "responseEnd") {
      newLine();
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
      newLine();
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
      return;
    }

    if (response.type === "textDelta") {
      console.write(response.content);
      return;
    }

    if (response.type === "textEnd") {
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
