import ora from "ora";
import { updateAssistant } from "../../openai/assistant.client.js";
import {
  promptAssistantConfig,
  promptAssistantSelection,
  renderAssistant,
} from "./assistant.utils.js";

export const updateAssistantAction = async () => {
  const assistant = await promptAssistantSelection();
  const config = await promptAssistantConfig();
  const spinner = ora({
    text: "Updating assistant",
    color: "blue",
  }).start();
  const updatedAssistant = await updateAssistant(assistant.id, config);
  spinner.stopAndPersist({
    text: "Assistant updated",
  });
  renderAssistant(updatedAssistant);
};
