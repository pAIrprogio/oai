import chalk from "chalk";
import { select } from "inquirer-select-pro";
import { asyncToArray } from "iter-tools";
import ora from "ora";
import { echo } from "zx";
import {
  VectorStore,
  getVectorStores,
} from "../../openai/vector-store.client.js";

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

export const renderSyncType = (syncType: VectorStore["syncConfig"]["type"]) => {
  switch (syncType) {
    case "unmanaged":
      return chalk.yellow("unmanaged");
    case "sitemap":
      return chalk.magenta("sitemap sync");
    default:
      return chalk.red("<unknown sync type>");
  }
};

export const renderStore = (store: VectorStore) => {
  echo(`${chalk.bold(store.name ?? "<unnamed>")} - ${store.playgroundUrl}`);
  echo(
    chalk.blue(
      `  ${renderStatus(store.status)} - ${store.filesCount} files / ${toKb(store.size)}kB - ${renderSyncType(store.syncConfig.type)}`,
    ),
  );
};

export async function promptVectorStoreSelection(
  message: string,
  multi: false,
): Promise<VectorStore>;
export async function promptVectorStoreSelection(
  message: string,
  multi: true,
): Promise<VectorStore[]>;
export async function promptVectorStoreSelection(
  message: string,
  multi: boolean = false,
) {
  let spinner = ora({
    text: "Fetching all vector stores",
    color: "blue",
  }).start();
  const stores = await asyncToArray(getVectorStores());
  spinner.stop();

  const answer = await select({
    message: message,
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
          value: s,
          name: `${s.name ?? chalk.italic("<unnamed>")} (${s.id}) | ${s.filesCount} files / ${toKb(s.size)}kB`,
        })),
  });

  return answer;
}
