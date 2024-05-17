import ora from "ora";
import { createAssistant } from "../../openai/assistant.client.js";
import { promptAssistantConfig, renderAssistant } from "./assistant.utils.js";

export const createAssistantAction = async () => {
  const config = await promptAssistantConfig();
  const spinner = ora({
    text: "Creating assistant",
    color: "blue",
  }).start();
  const assistant = await createAssistant(config);
  spinner.stopAndPersist({
    text: "Assistant created",
  });
  renderAssistant(assistant);
};
