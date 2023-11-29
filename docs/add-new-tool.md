## How to add a tool ?

1. Look at `tools/readFile.ts` for an example
2. Create a new file in `./tools/camelCaseToolName.ts` folder
3. Write and export an interface for your tool args
   - Export an interface with the name of the tool in PascalCase
   - Provide the tools description as the interface's JSDoc `@description` tag. Keep it on a single line.
   - The interface represents the input object for your tool
   - Add JSDoc above each property with `@description` tag. Keep it on a single line.
   - Use the `@default` tag whenever needed.
   - Do not export any other interfaces from the file

4. Write and export your tool function,

   - Takes a single arg which is the interface you exported
   - It's name should be the tool name in camelCase
   - Don't catch errors unless you want to silence them

5. Append your tool to `tools/index.ts` by adding `export { <toolName> } from "./<toolName>.js"`
6. Manually run `pnpm gen:tools` to generate the json schema for your tool.
