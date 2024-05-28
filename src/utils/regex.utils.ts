export const regexFilter = (regex?: string | RegExp) => {
  if (!regex) return (input: string) => true;
  if (regex instanceof RegExp) return (input: string) => regex.test(input);

  const filterRegex = new RegExp(regex);
  return (input: string) => filterRegex.test(input);
};
