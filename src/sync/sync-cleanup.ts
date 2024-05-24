import {
  deleteVectorStoreFile,
  getVectorStoreFiles,
} from "../openai/vector-store-files.client.js";

export async function* deleteStoreFilesBeforeDate(
  storeId: string,
  timestamp: number,
) {
  // Cleanup
  const storeFilesIterator = getVectorStoreFiles(storeId);
  for await (const file of storeFilesIterator) {
    if (file.created_at < timestamp) continue;
    yield file;
    await deleteVectorStoreFile(storeId, file.id);
  }
}
