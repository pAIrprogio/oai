import { asyncFilter, asyncForEach, asyncTap, pipe } from "iter-tools";
import { type VectorStoreFile } from "openai/resources/beta/vector-stores/files.mjs";
import ora from "ora";
import { chalk, echo } from "zx";
import {
  deleteVectorStoreFile,
  getVectorStoreFiles,
  uploadVectorStoreFile,
} from "../../openai/vector-store-files.client.js";
import { getSitemapPages } from "../../sync/sync-site-map.js";
import { promptVectorStoreSelection } from "./vector-store.utils.js";
import { ParsedVectorStore } from "../../openai/vector-store.client.js";
import { regexFilter } from "../../utils/regex.utils.js";
import { getUrlLinksPages } from "../../sync/sync-page-urls.js";

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
        ? getSitemapPages(store.syncConfig.url, store.syncConfig.filter)
        : getUrlLinksPages(store.syncConfig.url, store.syncConfig.filter);
    const pathRegex = regexFilter(store.syncConfig.filter);
    await pipe(
      asyncFilter((page: { url: string; html: Blob }) => pathRegex(page.url)),
      asyncTap(
        (page) =>
          (spinner.text = `Syncing ${store.name} - ${counter++} - ${page.url}`),
      ),
      asyncForEach((page) =>
        uploadVectorStoreFile(store.id, page.url, page.html),
      ),
    )(htmlFilesIterator);
    spinner.succeed(`Synced ${store.name} - ${counter} pages`);

    await cleanupStore(store, timestamp);
  }
};

async function cleanupStore(store: ParsedVectorStore, timestamp: number) {
  // Cleanup
  const spinner = ora({
    text: `Cleaning up ${store.name}`,
  }).start();
  const storeFilesIterator = getVectorStoreFiles(store.id);
  await pipe(
    asyncFilter((file: VectorStoreFile) => file.created_at < timestamp),
    asyncTap(
      (file) => (spinner.text = `Cleaning up ${store.name} - ${file.id}`),
    ),
    asyncForEach((file) => deleteVectorStoreFile(store.id, file.id)),
  )(storeFilesIterator);
  spinner.succeed(`Cleaned up ${store.name}`);
}
