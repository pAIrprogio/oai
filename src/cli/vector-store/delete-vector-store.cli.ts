import ora from "ora";
import { asyncToArray } from "iter-tools";
import { select } from "inquirer-select-pro";
import { deleteVectorStore, getVectorStores } from "../../openai.client.js";
import { toKb } from "./vector-store.utils.js";
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

  let spinner = ora({
    text: "Fetching all vector stores",
    color: "blue",
  }).start();
  const stores = await asyncToArray(getVectorStores());
  spinner.stop();

  const answer = await select({
    message: "Which vector store do you want to delete?",
    multiple: true,
    options: (input) =>
      stores
        .filter(
          (store) =>
            !input ||
            (store.name && store.name.includes(input)) ||
            store.id.includes(input),
        )
        .map((s) => ({
          value: s.id,
          name: `${s.name ?? chalk.italic("<unnamed>")} (${s.id}) | ${s.filesCount} files / ${toKb(s.size)}kB`,
        })),
  });

  spinner = ora({
    text: `Deleting ${answer.length} vector stores`,
    color: "blue",
  }).start();
  await Promise.all(answer.map((a) => deleteVectorStore(a)));
  spinner.stopAndPersist({
    symbol: "🗑",
    text: `${answer.length} vector stores deleted`,
  });
};
