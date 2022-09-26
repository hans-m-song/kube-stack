import path from "path";
import { assertEnv } from "./utils";

const hostname = assertEnv("HOSTNAME");
const cacheDir = assertEnv("CACHE_DIR");

export const registeredUrls: string[] = [];
const url = (subdomain: string, register?: boolean) => {
  const domain = `${subdomain}.${hostname}`;
  if (register) registeredUrls.push(domain);
  return domain;
};

const cache = (...names: string[]) => path.join(cacheDir, ...names);

export const prefetchImages: string[] = [];
const prefetch = (image: string) => {
  prefetchImages.push(image);
  return image;
};

export const config = {
  url,
  cache,
  prefetch,
  hostname,
  cacheDir,
  tz: process.env.TZ ?? "Australia/Brisbane",

  arc: {
    githubPAT: assertEnv("ARC_GITHUB_PAT"),
  },

  certManager: {
    email: assertEnv("CERT_MANAGER_EMAIL"),
    awsSecretAccessKey: assertEnv("CERT_MANAGER_AWS_SECRET_ACCESS_KEY"),
  },

  ddns: {
    r53CredentialsAccesskeyid: assertEnv(
      "DDNS_DDNSR53_CREDENTIALS_ACCESSKEYID"
    ),
    r53CredentialsSecretaccesskey: assertEnv(
      "DDNS_DDNSR53_CREDENTIALS_SECRETACCESSKEY"
    ),
    r53Route53Hostedzoneid: assertEnv("DDNS_DDNSR53_ROUTE53_HOSTEDZONEID"),
  },

  hass: {
    eufyUsername: assertEnv("HASS_EUFY_USERNAME"),
    eufyPassword: assertEnv("HASS_EUFY_PASSWORD"),
  },

  huisheng: {
    discordBotToken: assertEnv("HUISHENG_DISCORD_BOT_TOKEN"),
    discordClientId: assertEnv("HUISHENG_DISCORD_CLIENT_ID"),
    minioAccessKey: assertEnv("HUISHENG_MINIO_ACCESS_KEY"),
    minioSecretKey: assertEnv("HUISHENG_MINIO_SECRET_KEY"),
    youtubeApiKey: assertEnv("HUISHENG_YOUTUBE_API_KEY"),
  },

  minio: {
    rootPassword: assertEnv("MINIO_ROOT_PASSWORD"),
    rootUser: assertEnv("MINIO_ROOT_USER"),
  },

  mongo: {
    expressConfigBasicauthPassword: assertEnv(
      "MONGO_EXPRESS_CONFIG_BASICAUTH_PASSWORD"
    ),
    expressConfigBasicauthUsername: assertEnv(
      "MONGO_EXPRESS_CONFIG_BASICAUTH_USERNAME"
    ),
    expressConfigMongodbAdminpassword: assertEnv(
      "MONGO_EXPRESS_CONFIG_MONGODB_ADMINPASSWORD"
    ),
    expressConfigMongodbAdminusername: assertEnv(
      "MONGO_EXPRESS_CONFIG_MONGODB_ADMINUSERNAME"
    ),
    expressConfigMongodbEnableAdmin: assertEnv(
      "MONGO_EXPRESS_CONFIG_MONGODB_ENABLE_ADMIN"
    ),
    initdbRootPassword: assertEnv("MONGO_INITDB_ROOT_PASSWORD"),
    initdbRootUsername: assertEnv("MONGO_INITDB_ROOT_USERNAME"),
  },

  nfs: {
    serverIP: assertEnv("NFS_SERVER_IP"),
    exportPath: assertEnv("NFS_EXPORT_PATH"),
  },

  postgres: {
    user: assertEnv("POSTGRES_USER"),
    password: assertEnv("POSTGRES_PASSWORD"),
    db: assertEnv("POSTGRES_DB"),
    webEmail: assertEnv("POSTGRES_WEB_EMAIL"),
    webPassword: assertEnv("POSTGRES_WEB_PASSWORD"),
  },

  registry: {
    s3AccessKey: assertEnv("REGISTRY_S3_ACCESS_KEY_ID"),
    s3SecretKey: assertEnv("REGISTRY_S3_SECRET_ACCESS_KEY"),
  },
};
