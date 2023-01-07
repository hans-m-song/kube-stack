import "dotenv/config";
import "source-map-support/register";
import { App } from "cdk8s";
import { ActionsRunnerControllerChart } from "./charts/arc";
import { HuiShengChart } from "./charts/huisheng";
import { DynamicDNSChart } from "./charts/dynamic-dns";
import { CertManagerChart } from "./charts/cert-manager";
import { config, registeredUrls } from "./config";
import { MinioChart } from "./charts/minio";
import { MongoChart } from "./charts/mongo";
import { HomeAssistantChart } from "./charts/home-assistant";
import { MQTTChart } from "./charts/mqtt";
import { PostgresChart } from "./charts/postgres";
import { NFSChart } from "./charts/nfs";
import { MediaChart } from "./charts/media";
import { NewRelicChart } from "./charts/newrelic";

const app = new App({ outdir: "manifests" });

const certManagers = new CertManagerChart(app, "cert-manager", {
  namespace: "cert-manager",
  targetRevision: "v1.9.1",
});

new NFSChart(app, "nfs", {
  namespace: "kube-system",
  targetRevision: "4.0.17",
  nfsServer: config.nfs.serverIP,
  nfsPath: config.nfs.exportPath,
});

new PostgresChart(app, "postgres", {
  namespace: "postgres",
  url: config.url("psql.k8s"),
});

new NewRelicChart(app, "newrelic", {
  namespace: "newrelic",
});

new ActionsRunnerControllerChart(app, "arc", {
  namespace: "actions-runner-system",
  clusterIssuerName: certManagers.clusterIssuerPrd.node.id,
  webhookUrl: config.url("arc.k8s", true),
  targetRevision: "0.21.0",
  targets: [
    // repos
    // { repository: "hans-m-song/docker" },
    { repository: "hans-m-song/kube-stack" },
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
  clusterIssuerName: certManagers.clusterIssuerPrd.node.id,
});

new MongoChart(app, "mongo", {
  namespace: "mongo",
  url: config.url("mongo.k8s"),
});

new MQTTChart(app, "mqtt", {
  namespace: "mqtt",
  nodePort: 31883,
});

new HomeAssistantChart(app, "hass", {
  namespace: "home-assistant",
  url: config.url("hass.k8s", true),
  mqttUrl: config.url("mqtt.k8s"),
  clusterIssuerName: certManagers.clusterIssuerPrd.node.id,
  zigbeeUrl: config.url("zigbee2mqtt.k8s"),
  zigbeeHWBridgeId:
    "usb-ITEAD_SONOFF_Zigbee_3.0_USB_Dongle_Plus_V2_20220818083418-if00",
});

new HuiShengChart(app, "huisheng", {
  namespace: "huisheng",
  botPrefix: ">",
  minioServiceName: `${minio.svc.name}.${minio.namespace}`,
});

new MediaChart(app, "media", {
  namespace: "media",
  subdomain: "media.k8s",
  clusterIssuerName: certManagers.clusterIssuerPrd.node.id,
});

// should go last to pick up all the registered values
new DynamicDNSChart(app, "ddns", {
  namespace: "ddns",
  targets: registeredUrls,
});

app.synth();
