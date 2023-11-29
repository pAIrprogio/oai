import "dotenv/config";
import { chalk, echo, question, $ } from "zx";
import { message } from "./assistant.js";
import ora from "ora";

// Disable logging of stdout/stderr
$.verbose = false;

// Prevent forgetting case in switch statements
const never = (input: never) => {};
echo(chalk.bold.blue("Assistant: ") + "Hello, how can I help you?");

while (true) {
  const userInput = await question(chalk.bold.magenta("User: "));
  const res = message(userInput);

  let currentSpinner = ora({
    text: "Waiting",
    color: "blue",
  }).start();
  let previousActions = null;

  // Grab the interrupt function
  let interrupt: (() => Promise<void>) | null = null;
  // TODO: Find a way to use it

  for await (let status of res) {
    // Check here to clear TS errors
    if (typeof status === "function") throw new Error("Unexpected function");

    if (
      previousActions &&
      status.type !== "executing_actions" &&
      status.type !== "executing_actions_failure"
    ) {
      previousActions = null;
      currentSpinner.succeed();
      currentSpinner = ora({
        text: "Waiting",
        color: "cyan",
      }).start();
    }

    switch (status.type) {
      case "interruptFn":
        interrupt = status.interrupt;
        process.on("SIGINT", interrupt);
        break;
      case "executing_actions_failure":
        currentSpinner.fail();
        currentSpinner = ora({
          text: "Waiting",
          color: "blue",
        }).start();
        previousActions = null;
        break;

      case "executing_actions":
        const actions = status.tools.join(", ");

        if (previousActions && actions !== previousActions) {
          currentSpinner.color = "green";
          currentSpinner.succeed();
          currentSpinner = ora({
            text: "Executing actions: " + actions,
            color: "cyan",
          }).start();
        } else {
          currentSpinner.text = "Executing actions: " + actions;
        }

        previousActions = actions;
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
