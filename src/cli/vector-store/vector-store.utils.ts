import chalk from "chalk";
import { echo } from "zx";
import { VectorStore } from "../../openai.client.js";

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
