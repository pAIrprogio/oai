export const never = (input: never) => {};
export const throwOnUnhandled = (input: never, errorMessage: string) => {
  throw new Error(errorMessage);
};
