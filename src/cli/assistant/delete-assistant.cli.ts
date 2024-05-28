import ora from "ora";
import { deleteAssistant } from "../../openai/assistant.client.js";
import { promptAssistantSelection } from "./assistant.utils.js";

export const deleteAssistantAction = async (args?: string) => {
  if (args) {
    const spinner = ora({
      text: `Deleting ${args}`,
      color: "blue",
    }).start();
    await deleteAssistant(args);
    spinner.stopAndPersist({
      symbol: "🗑",
      text: "Assistant deleted",
    });
    return;
  }

  const answer = await promptAssistantSelection({
    message: "Which assistants do you want to delete?",
    multiple: true,
  });

  const spinner = ora({
    text: `Deleting ${answer.length} assistant(s)`,
    color: "blue",
  }).start();

  await Promise.all(answer.map((a) => deleteAssistant(a.id)));

  spinner.stopAndPersist({
    symbol: "🗑",
    text: `${answer.length} assistant(s) deleted`,
  });
};
