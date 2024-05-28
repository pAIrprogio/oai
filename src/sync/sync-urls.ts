import { getArticleFromUrl } from "../utils/web.utils.js";

function urlToFileName(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "/index") + ".html";
}

export async function getUrlAsPage(url: string) {
  return {
    url: urlToFileName(url),
    html: await getUrlAsBlob(url),
  };
}

const getUrlAsBlob = async (url: string) => {
  const res = await getArticleFromUrl(url);
  return new Blob([res.content], { type: "text/html" });
};
