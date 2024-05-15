import ora from "ora";
import { asyncToArray } from "iter-tools";
import { select } from "inquirer-select-pro";
import { deleteVectorStore, getVectorStores } from "../../openai.client.js";
import { promptVectorStoreSelection, toKb } from "./vector-store.utils.js";
import chalk from "chalk";

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

  const answer = await promptVectorStoreSelection(true);

  const spinner = ora({
    text: `Deleting ${answer.length} vector stores`,
    color: "blue",
  }).start();
  await Promise.all(answer.map((a) => deleteVectorStore(a)));
  spinner.stopAndPersist({
    symbol: "🗑",
    text: `${answer.length} vector stores deleted`,
  });
};
