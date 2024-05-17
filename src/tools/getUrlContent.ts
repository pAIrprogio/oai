import { z } from "zod";
import { Tool } from "../openai/tool.utils.js";
import axios from "axios";

const argsSchema = z.object({
  url: z.string(),
});

type Args = z.input<typeof argsSchema>;

interface ToMdResponse {
  metadata: {
    url?: string;
    title?: string;
    authors: string[];
    publication_date?: string;
    top_image?: string;
  };
  content: string;
}

export default {
  name: "getUrlContent",
  description: "Fetches the content of a URL",
  argsSchema,
  async call(args: Args) {
    const res = await axios.post<ToMdResponse>(
      "https://ai-toolkit.pairprog.io/2md/article-url",
      {
        url: args.url,
      },
      {
        headers: {
          Authorization: process.env.AI_TOOLKIT_API_KEY,
        },
      },
    );

    return {
      success: true,
      output: res.data,
    };
  },
} satisfies Tool<Args>;
