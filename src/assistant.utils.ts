import { Tool } from "./tool.utils.js";

export interface AssistantConfig<T extends Array<Tool> = Array<Tool>> {
  name: string;
  description: string;
  systemPrompt: string;
  tools: T;
}
