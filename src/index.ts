import "dotenv/config";
import "source-map-support/register";
import { App } from "cdk8s";
import { ActionsRunnerControllerChart } from "./charts/actions-runner-controller";
import { HuiShengChart } from "./charts/huisheng";
import { DynamicDNSChart } from "./charts/dynamic-dns";
import { PrefetchChart } from "./charts/prefetch";
import { HelloWorldChart } from "./charts/hello-world";
import { CertManagerChart } from "./charts/cert-manager";
import { config, Image } from "./config";
import { MinioChart } from "./charts/minio";

const app = new App({ outdir: "manifests" });

new ActionsRunnerControllerChart(app, "arc", {
  namespace: "actions-runner-system",
  webhookUrl: config.url("arc.k8s"),
  runnerImage: "public.ecr.aws/t4g8t3e5/gha-runner:latest",
  targets: [
    { repository: "hans-m-song/semantic-release-gha" },
    { repository: "hans-m-song/semantic-release-mono-test" },
    { repository: "hans-m-song/huisheng" },
    { repository: "hans-m-song/kube-stack" },
    { organization: "tunes-anywhere" },
  ],
});

new MinioChart(app, "minio", {
  namespace: "minio",
  credentialsSecretName: "credentials",
});

new HuiShengChart(app, "huisheng", {
  namespace: "huisheng",
  cachePath: config.cache("huisheng"),
  image: Image.GHARunner,
  credentialsSecretName: "credentials",
  botPrefix: ">",
});

new DynamicDNSChart(app, "ddns", {
  namespace: "ddns",
  hosts: [config.hostname],
});

new PrefetchChart(app, "prefetch", {
  namespace: "prefetch",
  images: Object.values(Image),
});

const certManagers = new CertManagerChart(app, "cert-manager", {
  email: process.env.CERT_MANAGER_EMAIL ?? "",
});

new HelloWorldChart(app, "hello-world", {
  namespace: "hello",
  clusterIssuer: certManagers.clusterIssuerPrd,
  url: config.url("hello.k8s"),
});

app.synth();
