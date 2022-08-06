import path = require("path");
import { assertEnv } from "./utils";

const hostname = assertEnv("HOSTNAME");
const certManagerEmail = assertEnv("CERT_MANAGER_EMAIL");
const cacheDir = assertEnv("CACHE_DIR");

export enum Image {
  Huisheng = "public.ecr.aws/t4g8t3e5/huisheng:latest",
  GHARunner = "public.ecr.aws/t4g8t3e5/gha-runner:latest",
}

export const registeredUrls: string[] = [];
const url = (subdomain: string, register?: boolean) => {
  const domain = `${subdomain}.${hostname}`;
  if (register) registeredUrls.push(domain);
  return domain;
};

const cache = (...names: string[]) => path.join(cacheDir, ...names);

export const config = {
  url,
  cache,
  hostname,
  certManagerEmail,
  cacheDir,
};
