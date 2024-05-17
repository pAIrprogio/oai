import { z } from "zod";
import { openaiClient } from "./openai.client.js";
import { PromiseReturnType } from "../ts.utils.js";
import { Assistant } from "openai/resources/beta/assistants.mjs";

const parseJson = (value: string | any): any => {
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
};

const metadataSchema = z.object({});

export type AssistantMetadata = z.infer<typeof metadataSchema>;

export const parseAssistant = (assistant: Assistant) => {
  return {
    ...assistant,
    metadata: metadataSchema.parse(assistant.metadata),
  };
};

export async function* getAssistants() {
  type ListRes = PromiseReturnType<typeof openaiClient.beta.assistants.list>;
  let res: ListRes = await openaiClient.beta.assistants.list();
  while (true) {
    yield* res.data;
    if (!res.hasNextPage()) return;
    res = await res.getNextPage();
  }
}

export async function getAssistant(id: string) {
  return openaiClient.beta.assistants.retrieve(id);
}
