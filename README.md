# OAI - OpenAI Assistant Interface

✨✨ Interacting ChatGPT with your system ✨✨

## Table of Contents

- [Why OAI](#why-oai)
- [Sample Usages](#sample-usages)
- [Installation](#installation)
- [Configure](#configure)
- [CLI Usage](#cli-usage)
  - [Global access](#global-access)
  - [Commands](#commands)
- [Vector Stores](#vector-stores)
- [Tools](#tools)
  - [Available tools](#available-tools)
  - [How to add tools ?](#how-to-add-tools)
- [Debugging](#debugging)

## Why OAI

The OpenAI Assistant API handles agents, conversation history, vector stores, and running tools which traditionnaly requires a lot of boilerplate code to set up.

Our goal with OAI is to provide a simple and intuitive interface to interact with this API.

The current version offers a CLI interface, but more will come in the future.

## Sample Usages

- Chat with up-to-date documentation with managed vector stores
- Ask question about your codebase by leveraging tools
- Ask your assistant to write code directly to files
- Let your assistant manage and access your system
- Configure and test an assistant for another integration
- _Whatever you can think of_

## Installation

OAI currently relies on [bun](https://bun.sh/), and it needs to be installed on your system in order to run the project.

A later version may allow using the `node` runtime, but for now, only `bun` is supported.

```bash
git clone git@github.com:pAIrprogio/gpt-assistant-cli-playground.git
bun install
```

## Configure

- Create a project on the [OpenAI Platform](https://platform.openai.com/organization/projects)
- Create an API Key
- Add your OpenAI API key to a .env file using `OPENAI_API_KEY=your-key`

## CLI Usage

### Global access

To install your assistant globally and access it with the `oai` command, run `bun link` in the project's folder.

Any change made to the project will be reflected in the global command without any extra build step.

### Commands

- `oai` or `oai chat`: starts a chat with an assistant
- `oai a|assistant`: manage your assistant
  - `oai a ls|list`: list available assistants
  - `oai a add|create|new`: create a new assistant
  - `oai a rm|remove|delete`: remove an assistant
  - `oai a e|edit`: edit an assistant
- `oai vs|vector-store`: manage your vector store
  - `oai vs ls|list`: list available vector stores
  - `oai vs add|create|new`: create a new vector store
  - `oai vs rm|remove|delete`: remove a vector store
  - `oai vs e|edit`: edit a vector store
  - `oai vs sync`: sync managed vector stores

## Vector Stores

Vector Stores are used by assistants with `file search` enabled to dynamically fetch relevant information. OAI helps you manage them custom synchronizations.

- **Sitemap sync**: Fetches urls from a sitemap, and synchronizes every page to the vector store
- **Page urls sync**: Fetches urls from a page, and synchronizes every url to the vector store
- _More to come_

## Tools

### Available tools

- [ls](./src/tools/ls.ts): Git aware file listing
- [read-file](./src/tools/readFile.ts): Read a file
- [write-file](./src/tools/writeFile.ts): Writes to a file, creating directories if needed
- [append-to-file](./src/tools/appendToFile.ts): Appends to an existing file
- [commit](./src/tools/commit.ts): Commits changes to the current branch
- [create-dir](./src/tools/createDir.ts): Creates a directory with its parents if needed
- [execute-command](./src/tools/executeCommand.ts): Executes a command (⚠️ Will not ask for confirmation)
- [get-url-content](./src/tools/getUrlContent.ts): Fetches the content of a URL
- [file-diff](./src/tools/fileDiff.ts): Reads the current diffs of a file

### How to add tools ?

Follow the steps in [docs/add-new-tool.md](docs/add-new-tool.md)

## Debugging

Due to issues in bun-vscode, you need to inspect through an external debugger.

To debug the project, run `bun debug` in the project's folder.
