# GPT4 Assistant CLI Playground

✨✨ Create your own GPT4 Assistant with ease and use it from the command line. ✨✨

https://github.com/pAIrprogio/assistant-cli-playground/assets/1863461/1256ad23-cca8-4cdb-9c42-adc84a606686

## What does it do?

- Runs an OpenAI GPT-4V assistant from the command line
- Execute tools from the command line as required
- Generates the JSON schema for your tools from TS interfaces
- Access it globally from the `ai` command in your terminal

## Installation

```bash
git clone git@github.com:pAIrprogio/gpt-assistant-cli-playground.git
pnpm install
pnpm start
```

## CLI Usage

To install your assistant globally and access it with the `ai` command, run `pnpm link -g` or `npm link` in the project's folder.

Any change made to the project will be reflected in the global command without extra build step.

## How to add tools ?

1. Create a new file in `./tools` folder
2. Write and export an interface for your tool args

   - The name of the interface is the name of the tool in PascalCase
   - The name of the interface will be camelCased and used as the tool name in the exported schema
   - Use JSDoc and `@description` or `@default` whenever needed. Keep them on single line.
   - Do not export other interfaces from the file or it will be recognized as a tool

3. Write and export your tool function,

   - Takes a single arg which is the interface you exported
   - It's name should be the tool name in camelCase
   - Errors should be caught and returned as an object like `{ success: false, error: 'error message' }`

4. Add your tool to `tools/index.ts` by adding `export { <toolName> } from "./<toolName>.js"`
5. Manually run `pnpm gen:tools` to generate the json schema for your tool. **THIS IS NOT AUTOMATIC YET**

## Debugging

The entire project is setup to be debugged in VSCode. Just run the `Run index.ts` task and it will start the app in debug mode in your terminal
