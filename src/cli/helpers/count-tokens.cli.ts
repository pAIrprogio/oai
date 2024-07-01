import ora from "ora";
import { countGlobToken } from "../../utils/tokens.utils.js";

export const countTokensAction = async (globFilters?: string) => {
  const spinner = ora({
    text: "Counting tokens",
    color: "blue",
  }).start();

  const res = await countGlobToken(globFilters);

  spinner.stopAndPersist({
    text: `Found ${res.tokensCount} tokens accross ${res.filesCount} files (OpenAI tokens)`,
  });
};
