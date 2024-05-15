import { Command } from "commander";
import { app } from "./app.cli.js";
import { listVectorStores } from "./list-vector-stores.cli.js";

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

    await app();
  });

const storesCommand = program
  .command("docs")
  .description("Manage your vector stores documents");

storesCommand
  .command("list")
  .description("List all vector stores")
  .action(listVectorStores);

program.parse();
