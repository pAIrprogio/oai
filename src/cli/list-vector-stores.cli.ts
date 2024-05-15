import { chalk, echo } from "zx";
import { getVectorStores } from "../openai.client.js";

const toKb = (bytes: number) => (bytes / 1024).toFixed(2);
const renderStatus = (status: "expired" | "in_progress" | "completed") => {
  switch (status) {
    case "expired":
      return chalk.bgRed.white(" expireed ");
    case "in_progress":
      return chalk.bgYellow.white(" syncing ");
    case "completed":
      return chalk.bgGreen.white(" synced ");
  }
};

export const listVectorStores = async () => {
  const storesIterator = getVectorStores();
  let storesCount = 0;
  echo(chalk.bgBlue.bold(" Vector stores: "));
  for await (const store of storesIterator) {
    echo("");
    echo(
      chalk.blue(
        `${chalk.bold(store.name ?? "<unnamed>")} - ${store.playgroundUrl}`,
      ),
    );
    echo(
      chalk.blue(
        `  ${renderStatus(store.status)} ${store.filesCount} files / ${toKb(store.size)}kB`,
      ),
    );
    storesCount++;
  }
  if (storesCount === 0) echo(chalk.yellow("No vector stores found"));
};
