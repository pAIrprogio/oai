import ora from "ora";
import { updateAssistant } from "../../openai/assistant.client.js";
import {
  promptAssistantConfig,
  promptAssistantSelection,
  renderAssistant,
} from "./assistant.utils.js";
import { chalk, echo } from "zx";

export const updateAssistantAction = async () => {
  const assistant = await promptAssistantSelection();
  const config = await promptAssistantConfig(assistant);
  const spinner = ora({
    text: "Updating assistant",
    color: "blue",
  }).start();
  const updatedAssistant = await updateAssistant(assistant.id, config);
  spinner.stop();
  echo("");
  echo(chalk.bold.green("Successfully updated assistant"));
  renderAssistant(updatedAssistant);
};
