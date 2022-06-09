import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { KubeDeployment, KubeNamespace } from "@/k8s";
import { Chart } from "~/utils";

export interface HuiShengChartProps extends ChartProps {
  image: string;
  credentialsSecretName: string;
  cachePath: string;
  botPrefix?: string;
}

export class HuiShengChart extends Chart {
  deployment: KubeDeployment;

  constructor(
    scope: Construct,
    id: string,
    {
      image,
      credentialsSecretName,
      cachePath,
      botPrefix,
      ...props
    }: HuiShengChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "huisheng" };

    new KubeNamespace(this, "namespace", {
      metadata: { name: props.namespace },
    });

    this.deployment = new KubeDeployment(this, "deployment", {
      spec: {
        replicas: 1,
        selector: { matchLabels: selector },
        template: {
          metadata: { labels: selector },
          spec: {
            containers: [
              {
                name: "huisheng",
                image,
                securityContext: { capabilities: { add: ["SYS_NICE"] } },
                env: [
                  { name: "DISCORD_BOT_PREFIX", value: botPrefix ?? ">" },
                  { name: "CACHE_DIR", value: "/data" },
                ],
                envFrom: [{ secretRef: { name: credentialsSecretName } }],
                volumeMounts: [{ name: "data", mountPath: "/data" }],
              },
            ],
            volumes: [
              {
                name: "data",
                hostPath: {
                  path: cachePath,
                  type: "DirectoryOrCreate",
                },
              },
            ],
          },
        },
      },
    });
  }
}
