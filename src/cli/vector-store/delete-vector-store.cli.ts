import ora from "ora";
import { deleteVectorStore } from "../../openai.client.js";
import { promptVectorStoreSelection } from "./vector-store.utils.js";

export const deleteVectorStoreAction = async (args?: string) => {
  if (args) {
    const spinner = ora({
      text: `Deleting vector store ${args}`,
      color: "blue",
    }).start();
    await deleteVectorStore(args);
    spinner.stopAndPersist({
      symbol: "🗑",
      text: "Store deleted",
    });
    return;
  }

  const answer = await promptVectorStoreSelection(
    "Which vector stores do you want to delete?",
    true,
  );

  const spinner = ora({
    text: `Deleting ${answer.length} vector stores`,
    color: "blue",
  }).start();

  await Promise.all(answer.map((a) => deleteVectorStore(a.id)));

  spinner.stopAndPersist({
    symbol: "🗑",
    text: `${answer.length} vector stores deleted`,
  });
};
