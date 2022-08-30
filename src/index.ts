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
import { PortainerChart } from "./charts/portainer";
import { PrometheusChart } from "./charts/prometheus";
import { MqttChart } from "./charts/mqtt";
import { RegistryChart } from "./charts/registry";
import { ArgoCDChart } from "./charts/argocd";
import { NFSProvisionerChart } from "./charts/nfs-provisioner";
import { PostgresChart } from "./charts/postgres";

const app = new App({ outdir: "manifests" });

const nfs = new NFSProvisionerChart(app, "nfs-provisioner", {
  namespace: "kube-system",
  targetRevision: "4.0.17",
  nfsServer: config.nfs.serverIP,
  nfsPath: config.nfs.exportPath,
});

new PostgresChart(app, "postgres", {
  namespace: "postgres",
  nfs,
  url: config.url("psql.k8s"),
});

const certManagers = new CertManagerChart(app, "cert-manager", {
  namespace: "cert-manager",
  targetRevision: "v1.9.1",
});

new ArgoCDChart(app, "argocd", {
  url: config.url("argocd.k8s", true),
  namespace: "argocd",
  targetRevision: "4.10.5",
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new PrometheusChart(app, "prometheus", {
  namespace: "monitoring",
  grafanaUrl: config.url("grafana.k8s", true),
  targetRevision: "39.4.0",
});

new PortainerChart(app, "portainer", {
  namespace: "portainer",
  url: config.url("portainer.k8s", true),
  targetRevision: "1.0.33",
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new HelloWorldChart(app, "hello-world", {
  namespace: "hello",
  url: config.url("hello.k8s", true),
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new ActionsRunnerControllerChart(app, "arc", {
  namespace: "actions-runner-system",
  nfs,
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
  webhookUrl: config.url("arc.k8s", true),
  targetRevision: "0.20.2",
  targets: [
    // repos
    { repository: "hans-m-song/docker" },
    { repository: "hans-m-song/huisheng" },
    { repository: "hans-m-song/semantic-release-gha" },
    { repository: "hans-m-song/home-assistant-integrations" },
    // organisations
    { organization: "tunes-anywhere" },
    { organization: "zidle-studio" },
  ],
});

const minio = new MinioChart(app, "minio", {
  namespace: "minio",
  apiUrl: config.url("api.minio.k8s", true),
  url: config.url("minio.k8s", true),
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
  nfs,
});

new MongoChart(app, "mongo", {
  namespace: "mongo",
  url: config.url("mongo.k8s"),
});

new RegistryChart(app, "registry", {
  namespace: "registry",
  minioServiceName: `${minio.svc.name}.${minio.namespace}`,
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

// these should go last to pick up all the registered domains

new PrefetchChart(app, "prefetch", {
  namespace: "prefetch",
  images: [
    ...prefetchImages,
    "public.ecr.aws/axatol/home-assistant-integrations:latest",
  ],
});

new DynamicDNSChart(app, "ddns", {
  namespace: "ddns",
  targets: registeredUrls,
});

app.synth();
