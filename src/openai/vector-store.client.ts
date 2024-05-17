import { VectorStore as OAIVectorStore } from "openai/resources/beta/index.mjs";
import { z } from "zod";
import { openaiClient } from "./openai.client.js";
import { safeParseJson } from "../utils/json.utils.js";

const syncConfigUnmanagedSchema = z.object({
  type: z.literal("unmanaged").optional().default("unmanaged"),
  version: z.literal("1").default("1"),
});

const syncConfigSitemapSchema = z.object({
  type: z.literal("sitemap"),
  version: z.literal("1").default("1"),
  url: z
    .string()
    .refine(
      (val) => val.startsWith("https://") && val.endsWith(".xml"),
      "Invalid sitemap url",
    ),
  filter: z
    .string()
    .optional()
    .superRefine((val, ctx) => {
      if (!val) return;
      try {
        new RegExp(val);
        return;
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid RegExp",
        });
        return false;
      }
    }),
});

const syncConfigSchema = z
  .discriminatedUnion("type", [
    syncConfigUnmanagedSchema,
    syncConfigSitemapSchema,
  ])
  .optional()
  .default({ type: "unmanaged", version: "1" });

const storeMetadataSchema = z.object({
  oai: z.preprocess(
    safeParseJson,
    z.object({ syncConfig: syncConfigSchema }).optional().default({}),
  ),
});

const storeConfigSchema = z.object({
  name: z.string(),
  metadata: z.object({
    syncConfig: syncConfigSchema,
  }),
});

export type StoreConfigInput = z.input<typeof storeConfigSchema>;

export const getVectorStorePlaygroundUrl = (storeId: string) =>
  `https://platform.openai.com/storage/vector_stores/${storeId}`;

const parseVectorStore = (store: OAIVectorStore) => {
  const metadata = storeMetadataSchema.parse(store.metadata);

  return {
    ...store,
    syncConfig: metadata.oai.syncConfig,
    playgroundUrl: getVectorStorePlaygroundUrl(store.id),
  };
};

export type ParsedVectorStore = ReturnType<typeof parseVectorStore>;

export async function* getVectorStores() {
  let res = await openaiClient.beta.vectorStores.list();

  do {
    for (const store of res.data) {
      yield parseVectorStore(store);
    }
    if (!res.hasNextPage()) break;
    res = await res.getNextPage();
  } while (true);
}

export async function getVectorStore(storeId: string) {
  const res = await openaiClient.beta.vectorStores.retrieve(storeId);
  return parseVectorStore(res);
}

export async function updateVectorStore(id: string, _config: StoreConfigInput) {
  const config = storeConfigSchema.parse(_config);
  const res = await openaiClient.beta.vectorStores.update(id, {
    ...config,
    metadata: {
      oai: JSON.stringify({ syncConfig: config.metadata.syncConfig }),
    },
  });
  return parseVectorStore(res);
}

export async function createVectorStore(_config: StoreConfigInput) {
  const config = storeConfigSchema.parse(_config);
  const res = await openaiClient.beta.vectorStores.create({
    ...config,
    metadata: {
      oai: JSON.stringify({ syncConfig: config.metadata.syncConfig }),
    },
  });

  return parseVectorStore(res);
}

export async function deleteVectorStore(storeId: string) {
  await openaiClient.beta.vectorStores.del(storeId);
}
