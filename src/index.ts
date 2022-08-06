import "dotenv/config";
import "source-map-support/register";
import { App } from "cdk8s";
import { ActionsRunnerControllerChart } from "./charts/actions-runner-controller";
import { HuiShengChart } from "./charts/huisheng";
import { DynamicDNSChart } from "./charts/dynamic-dns";
import { PrefetchChart } from "./charts/prefetch";
import { HelloWorldChart } from "./charts/hello-world";
import { CertManagerChart } from "./charts/cert-manager";
import { config, Image, registeredUrls } from "./config";
import { MinioChart } from "./charts/minio";
import { MongoChart } from "./charts/mongo";
import { HomeAssistantChart } from "./charts/home-assistant";
import { KubernetesDashboardChart } from "./charts/kubernetes-dashboard";
import { PortainerChart } from "./charts/portainer";
import { PrometheusChart } from "./charts/prometheus";
import { MosquittoChart } from "./charts/mosquitto";

const app = new App({ outdir: "manifests" });

const certManagers = new CertManagerChart(app, "cert-manager", {
  namespace: "cert-manager",
  email: config.certManagerEmail,
  targetRevision: "v1.9.1",
});

new PrefetchChart(app, "prefetch", {
  namespace: "prefetch",
  images: Object.values(Image),
});

new PrometheusChart(app, "prometheus", {
  namespace: "monitoring",
  grafanaUrl: config.url("grafana.k8s", true),
  prometheusUrl: config.url("prometheus.k8s", true),
  targetRevision: "0.58.0",
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
  webhookUrl: config.url("arc.k8s", true),
  runnerImage: "public.ecr.aws/t4g8t3e5/gha-runner:latest",
  targetRevision: "0.25.2",
  targets: [
    { repository: "hans-m-song/docker" },
    { repository: "hans-m-song/huisheng" },
    { repository: "hans-m-song/kube-stack" },
    { repository: "hans-m-song/semantic-release-gha" },
    { repository: "hans-m-song/semantic-release-mono-test" },
    { organization: "tunes-anywhere" },
  ],
});

const minio = new MinioChart(app, "minio", {
  namespace: "minio",
  apiUrl: config.url("api.minio.k8s", true),
  url: config.url("minio.k8s", true),
  credentialsSecretName: "credentials",
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new MongoChart(app, "mongo", {
  namespace: "mongo",
  url: config.url("mongo.k8s"),
  credentialsSecretName: "credentials",
});

const mqtt = new MosquittoChart(app, "mosquitto", {
  namespace: "mosquitto",
  url: "mqtt.k8s",
});

new HomeAssistantChart(app, "hass", {
  namespace: "home-assistant",
  url: config.url("hass.k8s", true),
  credentialsSecretName: "credentials",
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
  mqttServiceName: `${mqtt.service.name}.${mqtt.namespace}`,
});

new HuiShengChart(app, "huisheng", {
  namespace: "huisheng",
  cachePath: config.cache("huisheng"),
  image: Image.Huisheng,
  credentialsSecretName: "credentials",
  botPrefix: ">",
  minioServiceName: `${minio.svc.name}.${minio.namespace}`,
});

new KubernetesDashboardChart(app, "kubernetes-dashboard", {
  namespace: "kubernetes-dashboard",
  url: config.url("dash.k8s"),
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

// this should go last to pick up all the registered domains
new DynamicDNSChart(app, "ddns", {
  namespace: "ddns",
  credentialsSecretName: "credentials",
  targets: registeredUrls,
});

app.synth();
