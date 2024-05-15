import { VectorStore as OAIVectorStore } from "openai/resources/beta/index.mjs";
import { z } from "zod";
import { openaiClient } from "./openai.client.js";

export interface VectorStore {
  id: string;
  name: string;
  status: "expired" | "in_progress" | "completed";
  filesCount: number;
  size: number;
  playgroundUrl: string;
  syncConfig: StoreSyncConfig;
}

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
  syncConfig: syncConfigSchema,
});

const storeConfigSchema = z.object({
  name: z.string(),
  metadata: storeMetadataSchema,
});

type StoreSyncConfig = z.infer<typeof syncConfigSchema>;

export type StoreConfigInput = z.input<typeof storeConfigSchema>;

const getVectorStorePlaygroundUrl = (storeId: string) =>
  `https://platform.openai.com/storage/vector_stores/${storeId}`;

const jsonParseMetadataFields = (metadata: { [key: string]: string }) => {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      try {
        return [key, JSON.parse(value) as any];
      } catch (e) {
        return [key, value as string];
      }
    }),
  );
};

const jsonStringifyMetadataFields = (metadata: { [key: string]: any }) => {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      try {
        return [key, JSON.stringify(value)];
      } catch (e) {
        return [key, value as string];
      }
    }),
  );
};

const oaiVectorStoreToVectorStore = (store: OAIVectorStore): VectorStore => {
  const metadata = jsonParseMetadataFields(
    store.metadata as { [key: string]: string },
  );
  const syncConfig = syncConfigSchema.parse(metadata.syncConfig);

  return {
    id: store.id,
    name: store.name,
    status: store.status,
    filesCount: store.file_counts.total,
    size: store.usage_bytes,
    playgroundUrl: getVectorStorePlaygroundUrl(store.id),
    syncConfig,
  };
};

export async function* getVectorStores() {
  let res = await openaiClient.beta.vectorStores.list();

  do {
    for (const store of res.data) {
      yield oaiVectorStoreToVectorStore(store);
    }
    if (!res.hasNextPage()) break;
    res = await res.getNextPage();
  } while (true);
}

export async function getVectorStore(storeId: string) {
  const res = await openaiClient.beta.vectorStores.retrieve(storeId);
  return oaiVectorStoreToVectorStore(res);
}

export async function updateVectorStore(id: string, _config: StoreConfigInput) {
  const config = storeConfigSchema.parse(_config);
  const res = await openaiClient.beta.vectorStores.update(id, {
    ...config,
    metadata: jsonStringifyMetadataFields(config.metadata),
  });
  return oaiVectorStoreToVectorStore(res);
}

export async function createVectorStore(_config: StoreConfigInput) {
  const config = storeConfigSchema.parse(_config);
  const res = await openaiClient.beta.vectorStores.create({
    ...config,
    metadata: {
      ...config.metadata,
      syncConfig: JSON.stringify(config.metadata.syncConfig),
    },
  });

  return oaiVectorStoreToVectorStore(res);
}

export async function deleteVectorStore(storeId: string) {
  await openaiClient.beta.vectorStores.del(storeId);
}
