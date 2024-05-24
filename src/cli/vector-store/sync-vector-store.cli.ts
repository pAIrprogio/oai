import ora from "ora";
import { chalk, echo } from "zx";
import { ParsedVectorStore } from "../../openai/vector-store.client.js";
import { deleteStoreFilesBeforeDate } from "../../sync/sync-cleanup.js";
import { uploadUrlLinksPages } from "../../sync/sync-page-urls.js";
import { uploadSitemapPages } from "../../sync/sync-site-map.js";
import { promptVectorStoreSelection } from "./vector-store.utils.js";

export const syncVectorStoreCli = async () => {
  const store = await promptVectorStoreSelection({
    message: "Select a vector store to sync",
    multiple: false,
    excludeUnmanaged: true,
  });

  if (store.syncConfig.type === "unmanaged") {
    echo(chalk.yellow("Unmanaged vector store, skipping sync"));
    return;
  }

  if (store.status === "in_progress") {
    echo(chalk.yellow("Vector store is in progress, wait before syncing"));
    return;
  }

  const timestamp = Math.ceil(Date.now() / 1000);

  let spinner = ora({
    text: `Syncing ${store.name}`,
  }).start();

  if (
    store.syncConfig.type === "sitemap" ||
    store.syncConfig.type === "url_links"
  ) {
    // Sync
    let counter = 0;
    const htmlFilesIterator =
      store.syncConfig.type === "sitemap"
        ? uploadSitemapPages(store.id, store.syncConfig)
        : uploadUrlLinksPages(store.id, store.syncConfig);
    for await (const url of htmlFilesIterator) {
      counter++;
      spinner.text = `Syncing ${store.name} - ${counter} - ${url}`;
    }
    spinner.succeed(`Synced ${store.name} - ${counter} pages`);

    await cleanupStore(store, timestamp);
  }
};

async function cleanupStore(store: ParsedVectorStore, timestamp: number) {
  // Cleanup
  const spinner = ora({
    text: `Cleaning up ${store.name}`,
  }).start();
  const cleanupIterator = deleteStoreFilesBeforeDate(store.id, timestamp);
  for await (const file of cleanupIterator) {
    spinner.text = `Cleaning up ${store.name} - ${file.id}`;
  }
  spinner.succeed(`Cleaned up ${store.name}`);
}
