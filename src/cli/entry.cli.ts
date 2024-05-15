import { Command } from "commander";
import { appAction } from "./app.cli.js";
import { listVectorStoresAction } from "./vector-store/list-vector-stores.cli.js";
import { createVectorStoreAction } from "./vector-store/create-vector-store.cli.js";
import { deleteVectorStoreAction } from "./vector-store/delete-vector-store.cli.js";

const program = new Command();
program
  .name("ai")
  .description("Use your OpenAI assistant from the command line")
  .version("2.0.0");

const runCommand = program
  .command("chat", { isDefault: true, hidden: true })
  .argument("[args...]")
  .description("Start a chat with an assistant")
  .action(async (args) => {
    if (args.length > 0) {
      program.help();
      return;
    }

    await appAction();
  });

const storesCommand = program
  .command("vector-stores")
  .alias("vs")
  .description("Manage your vector stores");

storesCommand
  .command("list")
  .alias("ls")
  .allowExcessArguments(false)
  .description("List all vector stores")
  .action(listVectorStoresAction);

storesCommand
  .command("create")
  .allowExcessArguments(false)
  .description("Create a new vector store")
  .action(createVectorStoreAction);

storesCommand
  .command("delete")
  .alias("rm")
  .alias("remove")
  .alias("del")
  .argument("[id]", "The id of the vector store to delete")
  .allowExcessArguments(false)
  .description("Delete a vector store")
  .action(deleteVectorStoreAction);

program.parse();
