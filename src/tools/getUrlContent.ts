import { z } from "zod";
import { Tool } from "../openai/tool.utils.js";
import axios from "axios";
import { getArticleFromUrl } from "../utils/web.utils.js";

const argsSchema = z.object({
  url: z.string(),
});

type Args = z.input<typeof argsSchema>;

export default {
  name: "getUrlContent",
  description: "Fetches the content of a URL",
  argsSchema,
  async call(args: Args) {
    const article = await getArticleFromUrl(args.url);

    return {
      success: true,
      output: article,
    };
  },
} satisfies Tool<Args>;
