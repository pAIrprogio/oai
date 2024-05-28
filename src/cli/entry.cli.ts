import { Command } from "commander";
import { appAction } from "./app.cli.js";
import { listVectorStoresAction } from "./vector-store/list-vector-stores.cli.js";
import { createVectorStoreAction } from "./vector-store/create-vector-store.cli.js";
import { deleteVectorStoreAction } from "./vector-store/delete-vector-store.cli.js";
import { updateVectorStoreAction } from "./vector-store/update-vector-store.cli.js";
import { syncVectorStoreCli } from "./vector-store/sync-vector-store.cli.js";
import { listAssistantsAction } from "./assistant/list-assistants.cli.js";
import { createAssistantAction } from "./assistant/create-assistant.cli.js";
import { updateAssistantAction } from "./assistant/update-assistant.cli.js";
import { deleteAssistantAction } from "./assistant/delete-assistant.cli.js";

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

const assistantsCommand = program
  .command("assistants")
  .alias("ass")
  .alias("a")
  .description("Manage your assistants");

assistantsCommand
  .command("list")
  .alias("ls")
  .allowExcessArguments(false)
  .description("List all assistants")
  .action(listAssistantsAction);

assistantsCommand
  .command("create")
  .alias("new")
  .alias("add")
  .allowExcessArguments(false)
  .description("Create a new assistant")
  .action(createAssistantAction);

assistantsCommand
  .command("delete")
  .alias("rm")
  .alias("remove")
  .alias("del")
  .argument("[id]", "The id of the assistant to delete")
  .allowExcessArguments(false)
  .description("Delete a assistant")
  .action(deleteAssistantAction);

assistantsCommand
  .command("update")
  .alias("edit")
  .alias("e")
  .allowExcessArguments(false)
  .description("Update a assistant")
  .action(updateAssistantAction);

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
  .alias("new")
  .alias("add")
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

storesCommand
  .command("update")
  .alias("edit")
  .alias("e")
  .allowExcessArguments(false)
  .description("Update a vector store")
  .action(updateVectorStoreAction);

storesCommand
  .command("sync")
  .allowExcessArguments(false)
  .description("Sync a vector store")
  .action(syncVectorStoreCli);

program.parse();
