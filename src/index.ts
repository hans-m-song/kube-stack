import "dotenv/config";
import "source-map-support/register";
import { App } from "cdk8s";
import { ActionsRunnerControllerChart } from "./charts/actions-runner-controller";
import { HuiShengChart } from "./charts/huisheng";
import { DynamicDNSChart } from "./charts/dynamic-dns";
import { PrefetchChart } from "./charts/prefetch";
import { HelloWorldChart } from "./charts/hello-world";
import { CertManagerChart } from "./charts/cert-manager";
import { config, prefetchImages, registeredUrls } from "./config";
import { MinioChart } from "./charts/minio";
import { MongoChart } from "./charts/mongo";
import { HomeAssistantChart } from "./charts/home-assistant";
import { PrometheusChart } from "./charts/prometheus";
import { MqttChart } from "./charts/mqtt";
import { RegistryChart } from "./charts/registry";
import { ArgoCDChart } from "./charts/argocd";
import { PostgresChart } from "./charts/postgres";
import { NFSProvisionerChart } from "./charts/nfs-provisioner";
import { MediaChart } from "./charts/media";

const app = new App({ outdir: "manifests" });

new ArgoCDChart(app, "argocd", {
  url: config.url("argocd.k8s", true),
  namespace: "argocd",
  targetRevision: "4.10.5",
});

const certManagers = new CertManagerChart(app, "cert-manager", {
  namespace: "cert-manager",
  targetRevision: "v1.9.1",
});

new NFSProvisionerChart(app, "nfs-provisioner", {
  namespace: "kube-system",
  targetRevision: "4.0.17",
  nfsServer: config.nfs.serverIP,
  nfsPath: config.nfs.exportPath,
});

new PostgresChart(app, "postgres", {
  namespace: "postgres",
  url: config.url("psql.k8s"),
});

new PrometheusChart(app, "prometheus", {
  namespace: "monitoring",
  grafanaUrl: config.url("grafana.k8s", true),
  targetRevision: "39.4.0",
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new HelloWorldChart(app, "hello-world", {
  namespace: "hello",
  url: config.url("hello.k8s", true),
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new ActionsRunnerControllerChart(app, "arc", {
  namespace: "actions-runner-system",
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
  webhookUrl: config.url("arc.k8s", true),
  targetRevision: "0.20.2",
  targets: [
    // repos
    // { repository: "hans-m-song/docker" },
    { repository: "hans-m-song/kube-stack" },
    { repository: "hans-m-song/home-assistant-integrations" },
    { repository: "hans-m-song/huisheng" },
    // organisations
    // { organization: "zidle-studio" },
    { organization: "tunes-anywhere" },
    { organization: "axatol" },
  ],
});

const minio = new MinioChart(app, "minio", {
  namespace: "minio",
  apiUrl: config.url("api.minio.k8s", true),
  url: config.url("minio.k8s", true),
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new MongoChart(app, "mongo", {
  namespace: "mongo",
  url: config.url("mongo.k8s"),
});

new RegistryChart(app, "registry", {
  namespace: "registry",
  url: config.url("registry.k8s", true),
  // clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new MqttChart(app, "mqtt", {
  namespace: "mqtt",
  nodePort: 31883,
});

new HomeAssistantChart(app, "hass", {
  namespace: "home-assistant",
  url: config.url("hass.k8s", true),
  mqttUrl: config.url("mqtt.k8s"),
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new HuiShengChart(app, "huisheng", {
  namespace: "huisheng",
  botPrefix: ">",
  minioServiceName: `${minio.svc.name}.${minio.namespace}`,
});

new MediaChart(app, "media", {
  namespace: "media",
  url: config.url("media.k8s"),
});

// these should go last to pick up all the registered values

config.prefetch("public.ecr.aws/axatol/home-assistant-integrations:latest");
new PrefetchChart(app, "prefetch", {
  namespace: "prefetch",
  images: prefetchImages,
});

new DynamicDNSChart(app, "ddns", {
  namespace: "ddns",
  targets: registeredUrls,
});

app.synth();
