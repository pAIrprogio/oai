import ora from "ora";
import { createVectorStore } from "../../openai.client.js";
import { echo } from "zx";
import { renderStore } from "./vector-store.utils.js";

export const createVectorStoreAction = async (args: string) => {
  const spinner = ora({
    text: "Creating vector store",
    color: "blue",
  }).start();
  const store = await createVectorStore(args);
  spinner.stopAndPersist({
    text: "Store created",
  });
  echo("");
  renderStore(store);
};
