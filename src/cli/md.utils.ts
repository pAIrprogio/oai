import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

// @ts-ignore
marked.use(markedTerminal({}, {}));

export const mdToTerminal = (markdown: string) => {
  return (marked(markdown) as string).trim();
};
