import OpenAI from "openai";
import { VectorStore as OAIVectorStore } from "openai/resources/beta/index.mjs";
import { z } from "zod";

export interface VectorStore {
  id: string;
  name: string;
  status: "expired" | "in_progress" | "completed";
  filesCount: number;
  size: number;
  playgroundUrl: string;
  syncConfig?: StoreSyncConfig;
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const syncConfigSchema = z.object({
  type: z.literal("sitemap").default("sitemap"),
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

const storeMetadataSchema = z.object({
  syncConfig: syncConfigSchema,
});

const storeConfigSchema = z.object({
  name: z.string(),
  metadata: storeMetadataSchema,
});

type StoreSyncConfig = z.infer<typeof syncConfigSchema>;

type StoreConfigInput = z.input<typeof storeConfigSchema>;

const getVectorStorePlaygroundUrl = (storeId: string) =>
  `https://platform.openai.com/storage/vector_stores/${storeId}`;

const oaiVectorStoreToVectorStore = (store: OAIVectorStore): VectorStore => {
  const parsedMetadata = storeMetadataSchema.safeParse(store.metadata);

  return {
    id: store.id,
    name: store.name,
    status: store.status,
    filesCount: store.file_counts.total,
    size: store.usage_bytes,
    playgroundUrl: getVectorStorePlaygroundUrl(store.id),
    syncConfig: parsedMetadata.success
      ? parsedMetadata.data.syncConfig
      : undefined,
  };
};

export async function* getVectorStores() {
  let res = await client.beta.vectorStores.list();

  do {
    for (const store of res.data) {
      yield oaiVectorStoreToVectorStore(store);
    }
    if (!res.hasNextPage()) break;
    res = await res.getNextPage();
  } while (true);
}

export async function updateVectorStore(id: string, _config: StoreConfigInput) {
  const config = storeConfigSchema.parse(_config);
  const res = await client.beta.vectorStores.update(id, config);
  return oaiVectorStoreToVectorStore(res);
}

export async function createVectorStore(_config: StoreConfigInput) {
  const config = storeConfigSchema.parse(_config);
  const res = await client.beta.vectorStores.create(config);

  return oaiVectorStoreToVectorStore(res);
}

export async function deleteVectorStore(storeId: string) {
  await client.beta.vectorStores.del(storeId);
}
