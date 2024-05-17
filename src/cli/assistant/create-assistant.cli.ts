import ora from "ora";
import { createAssistant } from "../../openai/assistant.client.js";
import { promptAssistantConfig, renderAssistant } from "./assistant.utils.js";
import { chalk, echo } from "zx";

export const createAssistantAction = async () => {
  const config = await promptAssistantConfig();
  const spinner = ora({
    text: "Creating assistant",
    color: "blue",
  }).start();
  const assistant = await createAssistant(config);
  spinner.stop();
  echo("");
  echo(chalk.bold.green("Successfully created assistant"));
  renderAssistant(assistant);
};
