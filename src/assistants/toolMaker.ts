import { writeFile } from "../tools/writeFile.js";

export default {
  name: "toolMaker",
  description: "Agent that creates tools",
  systemPrompt: ``,
  tools: [writeFile],
};
