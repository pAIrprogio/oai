import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getVectorStorePlaygroundUrl = (storeId: string) =>
  `https://platform.openai.com/storage/vector_stores/${storeId}`;

export async function* getVectorStores() {
  let res = await client.beta.vectorStores.list();

  do {
    for (const store of res.data) {
      yield {
        id: store.id,
        name: store.name,
        status: store.status,
        filesCount: store.file_counts.total,
        size: store.usage_bytes,
        playgroundUrl: getVectorStorePlaygroundUrl(store.id),
      };
    }
    if (!res.hasNextPage()) break;
    res = await res.getNextPage();
  } while (true);
}
