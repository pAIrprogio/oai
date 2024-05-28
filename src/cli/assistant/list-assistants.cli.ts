import { chalk, echo } from "zx";
import { getAssistants } from "../../openai/assistant.client.js";
import { renderAssistant } from "./assistant.utils.js";

export const listAssistantsAction = async () => {
  const assistants = getAssistants();
  echo(chalk.bgBlue.bold(" Assistants: "));
  for await (const assistant of assistants) {
    echo("");
    renderAssistant(assistant);
  }
};
