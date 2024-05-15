import { chalk, echo } from "zx";
import { getVectorStores } from "../../openai/vector-store.client.js";
import { renderStore } from "./vector-store.utils.js";

export const listVectorStoresAction = async () => {
  const storesIterator = getVectorStores();
  let storesCount = 0;
  echo(chalk.bgBlue.bold(" Vector stores: "));
  for await (const store of storesIterator) {
    echo("");
    renderStore(store);
    storesCount++;
  }
  if (storesCount === 0) echo(chalk.yellow("No vector stores found"));
};
