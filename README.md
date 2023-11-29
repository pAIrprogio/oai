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
```

## Configure

- Add your OpenAI API key to a .env file using `OPENAI_API_KEY=your-key`
- Edit the ai.config.yml file as needed
  - This file is loaded from where you run the `ai` command so it can be different for each project.
  - Autocomplete is available for this file in VSCode using [./schemas/ai.config.schema.json](./schemas/ai.config.schema.json)

## CLI Usage

To install your assistant globally and access it with the `ai` command, run `pnpm link -g` or `npm link` in the project's folder.

Any change made to the project will be reflected in the global command without extra build step.

## How to add tools ?

Follow the steps in [docs/add-new-tool.md](docs/add-new-tool.md)

## Debugging

The entire project is setup to be debugged in VSCode. Just run the `Run index.ts` task and it will start the app in debug mode in your terminal
