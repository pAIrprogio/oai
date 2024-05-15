import ora from "ora";
import { echo } from "zx";
import { input, select } from "@inquirer/prompts";
import {
  StoreConfigInput,
  createVectorStore,
} from "../../openai/vector-store.client.js";
import { renderStore } from "./vector-store.utils.js";

export async function promptVectorStoreConfig(
  defaultValues?: StoreConfigInput,
): Promise<StoreConfigInput> {
  const name = await input({
    message: "Vector Store Name",
    default: defaultValues?.name,
  });

  const type = await select({
    message: "Vector Store Type",
    default: defaultValues?.metadata?.syncConfig?.type,
    choices: [
      {
        name: "Sitemap",
        value: "sitemap",
      },
      {
        name: "Unmanaged",
        value: "unmanaged",
      },
    ],
  });

  if (type === "unmanaged") return { name, metadata: { syncConfig: { type } } };

  if (type === "sitemap") {
    const url = await input({
      message: "Sitemap URL",
      // @ts-expect-error
      default: defaultValues?.metadata?.syncConfig?.url,
      validate: (value) =>
        (value.startsWith("http") && value.endsWith(".xml")) ||
        "URL must be match http(s)://**/*.xml",
    });
    const filter = await input({
      message: "Sitemap Filter",
      // @ts-expect-error
      default: defaultValues?.metadata?.syncConfig?.filter,
      validate: (value) => {
        if (!value) return true;
        try {
          new RegExp(value);
          return true;
        } catch (e) {
          return "Invalid RegExp";
        }
      },
    });
    return {
      name,
      metadata: {
        syncConfig: {
          type,
          version: "1",
          url,
          filter: filter ? filter : undefined,
        },
      },
    };
  }

  throw new Error("Unhandled type");
}

export const createVectorStoreAction = async () => {
  const config = await promptVectorStoreConfig();
  const spinner = ora({
    text: "Creating vector store",
    color: "blue",
  }).start();
  const store = await createVectorStore(config);
  spinner.stopAndPersist({
    text: "Store created",
  });
  echo("");
  renderStore(store);
};
