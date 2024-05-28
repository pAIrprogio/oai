export const safeParseJson = (value: string | any): any => {
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
};

export const objectEntriesToJson = (object: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, JSON.stringify(value)]),
  );
};

export const objectEntriesFromJson = (object: Record<string, string>) => {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [key, safeParseJson(value)]),
  );
};
