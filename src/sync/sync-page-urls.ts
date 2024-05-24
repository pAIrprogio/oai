import * as cheerio from "cheerio";
import wretch from "wretch";
import { regexFilter } from "../utils/regex.utils.js";
import { asyncFilter, asyncMap, pipe } from "iter-tools";
import { getUrlAsPage } from "./sync-urls.js";
import { uploadVectorStoreFile } from "../openai/vector-store-files.client.js";

async function* getUrlLinks(url: string) {
  const res = await wretch(url).get().text();
  const parsedUrl = new URL(url);
  const $ = cheerio.load(res);
  const nodes = $("body").find("a");

  const links = new Set<string>();
  for (const node of nodes) {
    const href = node.attribs?.href;
    if (!href) continue;
    const fullLink = href.startsWith("/") ? `${parsedUrl.origin}${href}` : href;
    if (links.has(fullLink)) continue;
    links.add(fullLink);
    if (fullLink.startsWith("http")) yield fullLink;
  }
}

export async function* getUrlLinksPages(
  sitemapUrl: string,
  urlFilter?: string,
) {
  const pathFilter = regexFilter(urlFilter);
  yield* pipe(
    getUrlLinks,
    asyncFilter(pathFilter),
    asyncMap(getUrlAsPage),
    asyncFilter((page) => page.html !== null),
  )(sitemapUrl);
}

export async function* uploadUrlLinksPages(
  storeId: string,
  {
    url,
    filter,
  }: {
    url: string;
    filter?: string;
  },
) {
  const pagesIterator = getUrlLinksPages(url, filter);
  for await (const page of pagesIterator) {
    yield page.url;
    await uploadVectorStoreFile(storeId, page.url, page.html);
  }
}
