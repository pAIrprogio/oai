import chalk from "chalk";
import { select } from "inquirer-select-pro";
import { asyncToArray } from "iter-tools";
import ora from "ora";
import { echo } from "zx";
import { VectorStore, getVectorStores } from "../../openai.client.js";

export const toKb = (bytes: number) => (bytes / 1024).toFixed(2);

export const renderStatus = (status: VectorStore["status"]) => {
  switch (status) {
    case "expired":
      return chalk.red("expired");
    case "in_progress":
      return chalk.yellow("syncing");
    case "completed":
      return chalk.green("synced");
  }
};

export const renderStore = (store: VectorStore) => {
  echo(`${chalk.bold(store.name ?? "<unnamed>")} - ${store.playgroundUrl}`);
  echo(
    chalk.blue(
      `  ${renderStatus(store.status)} - ${store.filesCount} files / ${toKb(store.size)}kB`,
    ),
  );
};

export async function promptVectorStoreSelection(multi: false): Promise<string>;
export async function promptVectorStoreSelection(
  multi: true,
): Promise<string[]>;
export async function promptVectorStoreSelection(multi: boolean = false) {
  let spinner = ora({
    text: "Fetching all vector stores",
    color: "blue",
  }).start();
  const stores = await asyncToArray(getVectorStores());
  spinner.stop();

  const answer = await select({
    message: "Which vector store do you want to delete?",
    multiple: multi,
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

  return answer;
}
