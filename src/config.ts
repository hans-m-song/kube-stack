import path = require("path");
import { assertEnv } from "./utils";

const hostname = assertEnv("HOSTNAME");
const certManagerEmail = assertEnv("CERT_MANAGER_EMAIL");
const cacheDir = assertEnv("CACHE_DIR");

export enum Image {
  Huisheng = "public.ecr.aws/t4g8t3e5/huisheng:latest",
  GHARunner = "public.ecr.aws/t4g8t3e5/gha-runner:latest",
}

const url = (subdomain: string) => `${subdomain}.${hostname}`;
const cache = (name: string) => path.join(cacheDir, name);

export const config = {
  url,
  cache,
  hostname,
  certManagerEmail,
  cacheDir,
};
