import { AssistantConfig } from "../openai/assistant.utils.js";
import { appendToFile } from "../tools/appendToFile.js";
import { executeCommand } from "../tools/executeCommand.js";
import { getUrlContent } from "../tools/getUrlContent.js";
import { ls } from "../tools/ls.js";
import { readFile } from "../tools/readFile.js";
import { writeFile } from "../tools/writeFile.js";

export default {
  name: "baseAssistant" as const,
  description: "",
  model: "gpt-4o",
  instructions: `You are a helpful assistant. Use any tools available to help the user`,
  tools: [readFile, ls, writeFile, executeCommand, appendToFile, getUrlContent],
} satisfies AssistantConfig;
