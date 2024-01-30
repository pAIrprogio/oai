import { AssistantConfig } from "../assistant.utils.js";
import { ls } from "../tools/ls.js";
import { readFile } from "../tools/readFile.js";

export default {
  name: "baseAssistant",
  description: "",
  systemPrompt: `You are a helpful assistant. Use any tools available to help the user.`,
  tools: [readFile, ls],
};
