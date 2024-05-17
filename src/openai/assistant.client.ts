import { z } from "zod";
import { openaiClient } from "./openai.client.js";
import { PromiseReturnType } from "../utils/ts.utils.js";
import { Assistant, AssistantTool } from "openai/resources/beta/assistants.mjs";
import { getOpenAITool } from "./tool.client.js";

const metadataSchema = z.object({}).optional().default({});

export type AssistantMetadata = z.infer<typeof metadataSchema>;

export const getAssistantPlaygroundUrl = (id: string) =>
  `https://platform.openai.com/playground/assistants?assistant=${id}&mode=assistant`;

export const parseAssistant = (assistant: Assistant) => {
  return {
    ...assistant,
    playgroundUrl: getAssistantPlaygroundUrl(assistant.id),
    isCodeInterpreterEnabled: assistant.tools.some(
      (tool) => tool.type === "code_interpreter",
    ),
    isFileSearchEnabled: assistant.tools.some(
      (tool) => tool.type === "file_search",
    ),
    respondWithJson:
      assistant.response_format &&
      typeof assistant.response_format !== "string" &&
      assistant.response_format.type === "json_object",
    toolNames: assistant.tools
      .filter(
        (tool): tool is Extract<AssistantTool, { type: "function" }> =>
          tool.type === "function",
      )
      .map((tool) => tool.function.name),
    metadata: metadataSchema.parse(assistant.metadata),
  };
};

export type ParsedAssistant = ReturnType<typeof parseAssistant>;

export async function* getAssistants() {
  type ListRes = PromiseReturnType<typeof openaiClient.beta.assistants.list>;
  let res: ListRes = await openaiClient.beta.assistants.list();
  while (true) {
    yield* res.data.map(parseAssistant);
    if (!res.hasNextPage()) return;
    res = await res.getNextPage();
  }
}

export async function getAssistant(id: string) {
  const assistant = await openaiClient.beta.assistants.retrieve(id);
  return parseAssistant(assistant);
}

export const assistantConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  model: z.string().min(1),
  temperature: z.coerce.number().gte(0).lte(1),
  instructions: z.string().optional(),
  metadata: metadataSchema,
  isCodeInterpreterEnabled: z.boolean().optional().default(false),
  isFileSearchEnabled: z.boolean().optional().default(false),
  respondWithJson: z.boolean().optional().default(false),
  toolNames: z.array(z.string()).optional().default([]),
  vectorStoreIds: z.array(z.string()).optional().default([]),
});

export type AssistantConfigInput = z.input<typeof assistantConfigSchema>;
export type AssistantConfig = z.output<typeof assistantConfigSchema>;

async function getToolsConfig(config: AssistantConfig) {
  const codeInterpreter = config.isCodeInterpreterEnabled
    ? ([{ type: "code_interpreter" }] as const)
    : [];

  const fileSearch = config.isFileSearchEnabled
    ? ([{ type: "file_search" }] as const)
    : [];

  const tools = await Promise.all(config.toolNames.map(getOpenAITool));

  return [...codeInterpreter, ...fileSearch, ...tools];
}

export async function createAssistant(_config: AssistantConfigInput) {
  const config = assistantConfigSchema.parse(_config);

  const assistant = await openaiClient.beta.assistants.create({
    name: config.name,
    model: config.model,
    description: config.description,
    temperature: config.temperature,
    instructions: config.instructions,
    metadata: config.metadata,
    tools: await getToolsConfig(config),
  });

  return parseAssistant(assistant);
}

export async function updateAssistant(
  id: string,
  _config: AssistantConfigInput,
) {
  const config = assistantConfigSchema.parse(_config);

  const assistant = await openaiClient.beta.assistants.update(id, {
    name: config.name,
    description: config.description,
    model: config.model,
    temperature: config.temperature,
    instructions: config.instructions,
    metadata: config.metadata,
    tool_resources: {
      file_search: {
        vector_store_ids: config.vectorStoreIds,
      },
    },
    response_format: config.respondWithJson
      ? { type: "json_object" }
      : { type: "text" },
    tools: await getToolsConfig(config),
  });

  return parseAssistant(assistant);
}

export async function deleteAssistant(id: string) {
  await openaiClient.beta.assistants.del(id);
}
