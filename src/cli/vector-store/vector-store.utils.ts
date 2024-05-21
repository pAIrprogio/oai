import chalk from "chalk";
import { select as selectPro } from "inquirer-select-pro";
import { asyncToArray } from "iter-tools";
import ora from "ora";
import { echo } from "zx";
import prettyBytes from "pretty-bytes";
import {
  ParsedVectorStore,
  getVectorStores,
} from "../../openai/vector-store.client.js";

export const renderStatus = (status: ParsedVectorStore["status"]) => {
  switch (status) {
    case "expired":
      return chalk.red("expired");
    case "in_progress":
      return chalk.yellow("syncing");
    case "completed":
      return chalk.green("synced");
  }
};

export const renderSyncType = (
  syncType: ParsedVectorStore["syncConfig"]["type"],
) => {
  switch (syncType) {
    case "unmanaged":
      return chalk.yellow("unmanaged");
    case "sitemap":
      return chalk.magenta("sitemap sync");
    case "url_links":
      return chalk.magenta("links sync");
    default:
      return chalk.red("<unknown sync type>");
  }
};

export const renderStore = (store: ParsedVectorStore) => {
  echo(`${chalk.bold(store.name ?? "<unnamed>")} (${store.id})`);
  echo("  " + chalk.underline(store.playgroundUrl));
  echo(
    chalk.blue(
      `  ${renderStatus(store.status)} - ${store.file_counts.total} files / ${prettyBytes(store.usage_bytes)} - ${renderSyncType(store.syncConfig.type)}`,
    ),
  );
};

export async function promptVectorStoreSelection(config?: {
  message?: string;
  multiple?: false;
  excludeUnmanaged?: boolean;
  defaultSelected?: string[];
}): Promise<ParsedVectorStore>;
export async function promptVectorStoreSelection(config?: {
  message?: string;
  multiple: true;
  excludeUnmanaged?: boolean;
  defaultSelectedIds?: string[];
}): Promise<ParsedVectorStore[]>;
export async function promptVectorStoreSelection(config?: {
  message?: string;
  multiple?: boolean;
  excludeUnmanaged?: boolean;
  defaultSelectedIds?: string[];
}) {
  let spinner = ora({
    text: "Fetching all vector stores",
    color: "blue",
  }).start();
  let stores = await asyncToArray(getVectorStores());
  spinner.stop();

  if (config?.excludeUnmanaged)
    stores = stores.filter((store) => store.syncConfig.type !== "unmanaged");

  const preSelectedSet = new Set(config?.defaultSelectedIds ?? []);
  const defaultValues = config?.multiple
    ? stores.filter((store) => preSelectedSet.has(store.id))
    : undefined;

  const answer = await selectPro({
    message: config?.message ?? "Which vector store do you want to use?",
    multiple: config?.multiple ?? false,
    validate: (input) => input !== null,
    defaultValue: defaultValues,
    equals: (a, b) => a.id === b.id,
    options: (input) =>
      stores
        .filter(
          (store) =>
            !input ||
            (store.name &&
              store.name.toLowerCase().includes(input.toLowerCase())) ||
            store.id.toLowerCase().includes(input.toLowerCase()),
        )
        .map((s) => ({
          value: s,
          name: `${s.name ?? chalk.italic("<unnamed>")} (${s.id}) | ${s.file_counts.total} files / ${prettyBytes(s.usage_bytes)}`,
        })),
  });

  return answer;
}
