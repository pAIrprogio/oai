import ora from "ora";
import { updateVectorStore } from "../../openai/vector-store.client.js";
import { promptVectorStoreConfig } from "./create-vector-store.cli.js";
import { promptVectorStoreSelection } from "./vector-store.utils.js";

export const updateVectorStoreAction = async () => {
  const store = await promptVectorStoreSelection({
    message: "Which vector store do you want to update?",
    multiple: false,
  });

  const config = await promptVectorStoreConfig({
    name: store.name,
    metadata: {
      syncConfig: store.syncConfig,
    },
  });

  const spinner = ora({
    text: "Updating vector store",
    color: "blue",
  }).start();
  await updateVectorStore(store.id, config);
  spinner.succeed("Vector store updated");
};
