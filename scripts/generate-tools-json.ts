#!/usr/bin/env ./node_modules/.bin/tsx

import { createGenerator } from "ts-json-schema-generator";
import { writeFileSync } from "fs";
import camelCase from "lodash/camelCase.js";

const config = {
  path: "./tools/**/*.ts",
  tsconfig: "./tsconfig.json",
  type: "*",
  skipTypeCheck: true,
};

// TODO: parse functions properly

const FUNCTION_PARAM_REGEX = /^NamedParameters/;

const schema: any = createGenerator(config).createSchema(config.type);

const names = Object.keys(schema.definitions).filter(
  (name) => !FUNCTION_PARAM_REGEX.test(name),
);

const res = names.reduce(
  (acc, name) => {
    const def = schema.definitions[name];
    const camelName = camelCase(name);
    const toolDef = {
      name: camelName,
      description: def.description,
      parameters: {
        type: "object",
        properties: def.properties,
        required: def.required,
      },
    };
    return {
      ...acc,
      [camelName]: toolDef,
      allTools: [...acc.allTools, toolDef],
    };
  },
  { allTools: [] as any[] },
);

writeFileSync("./tools/definitions.json", JSON.stringify(res, null, 2));
console.log("Wrote tools/definitions.json");
