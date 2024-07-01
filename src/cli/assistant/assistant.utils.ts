import { input, select, confirm, editor } from "@inquirer/prompts";
import { select as selectPro } from "inquirer-select-pro";
import {
  AssistantConfigInput,
  ParsedAssistant,
  assistantConfigSchema,
  getAssistants,
} from "../../openai/assistant.client.js";
import { MODELS } from "../../openai/openai.client.js";
import { asyncToArray } from "iter-tools";
import ora from "ora";
import { chalk, echo } from "zx";
import { getToolsNames } from "../../openai/tool.client.js";
import { promptVectorStoreSelection } from "../vector-store/vector-store.utils.js";

export const promptAssistantConfig = async (
  assistant?: ParsedAssistant,
): Promise<AssistantConfigInput> => {
  const name = await input({
    message: "Name",
    default: assistant?.name ?? undefined,
    validate: (input) =>
      assistantConfigSchema.shape.name.safeParse(input).success,
  });

  const description = await input({
    message: "Description",
    default: assistant?.description ?? undefined,
    validate: (input) =>
      assistantConfigSchema.shape.description.safeParse(input).success,
  });

  const temperature = await input({
    message: "Temperature (0 to 1)",
    default: assistant?.temperature?.toString() ?? "0.5",
    validate: (input) =>
      assistantConfigSchema.shape.temperature.safeParse(input).success,
  });

  const model = await select({
    message: "Model",
    default: assistant?.model ?? MODELS[0],
    choices: MODELS.map((m) => ({ value: m })),
  });

  const isCodeInterpreterEnabled = await confirm({
    message: "Enable code interpreter",
    default: assistant?.isCodeInterpreterEnabled ?? false,
  });

  const allTools = await asyncToArray(getToolsNames());

  const toolNames = await selectPro({
    message: "Select tools",
    options: allTools.map((t) => ({ value: t })),
    multiple: true,
    defaultValue: assistant?.toolNames ?? [],
  });

  const isFileSearchEnabled = await confirm({
    message: "Enable file search",
    default: assistant?.isFileSearchEnabled ?? false,
  });

  let vectorStoreIds: string[] | undefined;
  if (isFileSearchEnabled)
    vectorStoreIds = await promptVectorStoreSelection({
      message: "Select vector stores",
      multiple: true,
      defaultSelectedIds:
        assistant?.tool_resources?.file_search?.vector_store_ids ?? [],
    }).then((store) => store.map((s) => s.id));

  const respondWithJson = await confirm({
    message: "Enable JSON only response?",
    default: assistant?.respondWithJson ?? false,
  });

  const shouldEditInstructions = await confirm({
    message: "Edit instructions?",
    default: true,
  });

  let instructions = assistant?.instructions ?? "";
  if (shouldEditInstructions) {
    instructions = await editor({
      message: "Instructions",
      default: instructions,
      validate: (input) =>
        assistantConfigSchema.shape.instructions.safeParse(input).success,
    });
  }

  // Handle Tools

  return {
    name,
    description,
    model,
    toolNames,
    temperature: parseFloat(temperature),
    instructions,
    isCodeInterpreterEnabled,
    isFileSearchEnabled,
    respondWithJson,
    vectorStoreIds,
  };
};

export async function promptAssistantSelection(config?: {
  message?: string;
  multiple?: false;
}): Promise<ParsedAssistant>;
export async function promptAssistantSelection(config?: {
  message?: string;
  multiple?: true;
}): Promise<ParsedAssistant[]>;
export async function promptAssistantSelection(config?: {
  message?: string;
  multiple?: boolean;
}): Promise<ParsedAssistant | ParsedAssistant[]> {
  let spinner = ora({
    text: "Fetching all assistants",
    color: "blue",
  }).start();
  const allAssistants = await asyncToArray(getAssistants());
  spinner.stop();

  if (allAssistants.length === 0) {
    echo(chalk.yellow("No assistants found"));
    process.exit(0);
  }

  const answer = (await selectPro({
    message: config?.message ?? "Which assistant do you want to use?",
    validate: (input) => input !== null,
    options: (input) =>
      allAssistants
        .filter(
          (a) =>
            !input ||
            (a.name && a.name.toLowerCase().includes(input.toLowerCase())) ||
            a.id.toLowerCase().includes(input.toLowerCase()),
        )
        .map((a) => ({
          name: `${a.name ?? chalk.italic("<unnamed>")} (${a.id}) ${a.description ? `- ${a.description}` : ""}`,
          value: a,
        })),
    multiple: config?.multiple ?? false,
  })) as ParsedAssistant | ParsedAssistant[];

  return answer;
}

export const renderAssistant = (assistant: ParsedAssistant) => {
  let firstLine =
    chalk.bold(assistant.name ?? chalk.italic("<unnamed>")) +
    ` (${assistant.id})`;
  if (assistant.description) firstLine += ` - ${assistant.description}`;
  echo(firstLine);

  const vector_stores_count =
    assistant.tool_resources?.file_search?.vector_store_ids?.length;

  echo("  " + chalk.underline(`${assistant.playgroundUrl}`));

  let secondLine = [
    chalk.green(assistant.model),
    chalk.blue(`t°${assistant.temperature}`),
  ];

  if (assistant.tools.length > 0)
    secondLine.push(
      chalk.magenta(
        `${assistant.tools.length} tool${assistant.tools.length === 1 ? "" : "s"}`,
      ),
    );

  if (vector_stores_count)
    secondLine.push(
      chalk.yellow(
        `${vector_stores_count} vector store${vector_stores_count === 1 ? "" : "s"}`,
      ),
    );

  echo("  " + secondLine.join(" - "));
};
