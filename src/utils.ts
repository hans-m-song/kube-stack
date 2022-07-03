export const slug = (input: string): string =>
  input.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const assertEnv = (key: string): string => {
  if (!process.env[key]) {
    throw new Error(`missing required environment variable: "${key}"`);
  }

  return process.env[key] ?? "";
};
