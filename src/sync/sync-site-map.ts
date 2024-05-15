import wretch from "wretch";
import xml2js from "xml2js";
import { pipe, asyncFilter, map, filter } from "iter-tools";

function urlToFileName(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "index") + ".html";
}

export async function* getSitemapPages(sitemapUrl: string, urlFilter?: string) {
  const sitemapXml = await getPlainTextUrl(sitemapUrl);
  const filterRegex = urlFilter ? new RegExp(urlFilter) : undefined;
  const sitemap =
    (await xml2js.parseStringPromise(sitemapXml)).urlset?.url ??
    ([] as { loc: [string] }[]);

  yield* pipe(
    map((page: { loc: [string] }) => page.loc[0]),
    filter((url) => (urlFilter ? !filterRegex || filterRegex.test(url) : true)),
    map(async (url) => ({
      url: urlToFileName(url),
      html: await getUrlAsBlob(url),
    })),
    asyncFilter(({ html }) => html !== null),
  )(sitemap);
}

export function getUrlAsBlob(url: string) {
  return wretch(url).get().blob();
}

export function getPlainTextUrl(url: string) {
  return wretch(url).get().text();
}
