import { toFile } from "openai";
import { openaiClient } from "./openai.client.js";

export async function* getVectorStoreFiles(storeId: string) {
  let res = await openaiClient.beta.vectorStores.files.list(storeId);

  do {
    yield* res.data;
    if (!res.hasNextPage()) break;
    res = await res.getNextPage();
  } while (true);
}

export async function deleteVectorStoreFile(storeId: string, fileId: string) {
  await openaiClient.beta.vectorStores.files.del(storeId, fileId);
}

export async function uploadVectorStoreFile(
  storeId: string,
  fileName: string,
  file: ReadableStream | Blob,
) {
  const res = await openaiClient.beta.vectorStores.files.upload(
    storeId,
    await toFile(file, fileName),
  );
  return res;
}
