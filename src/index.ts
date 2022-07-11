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

const certManagers = new CertManagerChart(app, "cert-manager", {
  namespace: "cert-manager",
  email: config.certManagerEmail,
});

new DynamicDNSChart(app, "ddns", {
  namespace: "ddns",
  credentialsSecretName: "credentials",
  targets: [config.url("hello.k8s"), config.url("arc.k8s")],
});

new PrefetchChart(app, "prefetch", {
  namespace: "prefetch",
  images: Object.values(Image),
});

new HelloWorldChart(app, "hello-world", {
  namespace: "hello",
  url: config.url("hello.k8s"),
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

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

const minio = new MinioChart(app, "minio", {
  namespace: "minio",
  url: config.url("minio.k8s"),
  credentialsSecretName: "credentials",
  clusterIssuerName: certManagers.clusterIssuerPrd.name,
});

new HuiShengChart(app, "huisheng", {
  namespace: "huisheng",
  cachePath: config.cache("huisheng"),
  image: Image.Huisheng,
  credentialsSecretName: "credentials",
  botPrefix: ">",
  minioServiceName: `${minio.svc.name}.${minio.namespace}`,
});

app.synth();
