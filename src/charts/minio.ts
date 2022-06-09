import { IntOrString, KubeDeployment, KubeNamespace, KubeService } from "@/k8s";
import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { config } from "~/config";
import { Chart } from "~/utils";

interface MinioChartProps extends ChartProps {
  credentialsSecretName: string;
}

export class MinioChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { credentialsSecretName, ...props }: MinioChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "minio" };

    new KubeNamespace(this, "namespace", {
      metadata: { name: this.namespace },
    });

    new KubeDeployment(this, "deployment", {
      spec: {
        selector: { matchLabels: selector },
        template: {
          metadata: { labels: selector },
          spec: {
            containers: [
              {
                name: "minio",
                image: "quay.io/minio/minio",
                command: ["server", "/data", "--console-address", ":9001"],
                ports: [
                  { containerPort: 9000, name: "api" },
                  { containerPort: 9001, name: "console" },
                ],
                envFrom: [{ secretRef: { name: credentialsSecretName } }],
                volumeMounts: [{ name: "data", mountPath: "/data" }],
              },
            ],
            volumes: [
              {
                name: "data",
                hostPath: {
                  path: config.cache("minio"),
                  type: "DirectoryOrCreate",
                },
              },
            ],
          },
        },
      },
    });

    new KubeService(this, "service", {
      spec: {
        selector,
        type: "ClusterIP",
        ports: [
          {
            name: "api",
            port: 9000,
            targetPort: IntOrString.fromString("api"),
          },
          {
            name: "console",
            port: 9001,
            targetPort: IntOrString.fromString("console"),
          },
        ],
      },
    });

    // TODO ingress
  }
}
