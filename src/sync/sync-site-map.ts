import xml2js from "xml2js";
import { getUrl } from "../utils/web.utils.js";
import { asyncFilter, asyncMap, pipe } from "iter-tools";
import { regexFilter } from "../utils/regex.utils.js";
import { getUrlAsPage } from "./sync-urls.js";
import { uploadVectorStoreFile } from "../openai/vector-store-files.client.js";

async function* getSitemapUrls(sitemapUrl: string) {
  const sitemapXml = await getUrl(sitemapUrl);
  const sitemap =
    (await xml2js.parseStringPromise(sitemapXml)).urlset?.url ??
    ([] as { loc: [string] }[]);
  return sitemap.map((page: { loc: [string] }) => page.loc[0]);
}

export async function* getSitemapPages(sitemapUrl: string, urlFilter?: string) {
  const pathFilter = regexFilter(urlFilter);
  yield* pipe(
    getSitemapUrls,
    asyncFilter(pathFilter),
    asyncMap(getUrlAsPage),
    asyncFilter((page) => page.html !== null),
  )(sitemapUrl);
}

export async function* uploadSitemapPages(
  storeId: string,
  {
    url,
    filter,
  }: {
    url: string;
    filter?: string;
  },
) {
  const pagesIterator = getSitemapPages(url, filter);
  for await (const page of pagesIterator) {
    yield page.url;
    await uploadVectorStoreFile(storeId, page.url, page.html);
  }
}
