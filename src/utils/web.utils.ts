import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export const getUrl = async (url: string) => {
  const res = await fetch(url);
  return res.text();
};

export const getArticleFromUrl = async (url: string) => {
  const content = await getUrl(url);
  const doc = new JSDOM(content, { url });
  let reader = new Readability(doc.window.document);
  let article = reader.parse();

  if (!article?.content)
    return {
      url,
      error: "No article content found, defaulted to base content",
      content,
    };

  return {
    url,
    content: article.content,
    title: article.title,
    byline: article.byline,
    siteName: article.siteName,
    lang: article.lang,
    publishedTime: article.publishedTime,
  };
};
