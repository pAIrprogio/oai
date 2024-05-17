import { asyncFilter, filter, map, pipe } from "iter-tools";
import xml2js from "xml2js";
import { getArticleFromUrl, getUrl } from "../utils/web.utils.js";

function urlToFileName(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "index") + ".html";
}

export async function* getSitemapPages(sitemapUrl: string, urlFilter?: string) {
  const sitemapXml = await getUrl(sitemapUrl);
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

const getUrlAsBlob = async (url: string) => {
  const res = await getArticleFromUrl(url);
  return new Blob([res.content], { type: "text/html" });
};
