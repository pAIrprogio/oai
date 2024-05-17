export const never = (input: never) => {};

export const throwOnUnhandled = (input: never, errorMessage: string) => {
  throw new Error(errorMessage);
};

export type PromiseValue<T> = T extends Promise<infer U> ? U : never;
export type PromiseReturnType<T extends (...args: any) => any> = PromiseValue<
  ReturnType<T>
>;
