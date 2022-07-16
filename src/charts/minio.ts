import { IntOrString, KubeNamespace, KubeService } from "@/k8s";
import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { config } from "~/config";
import { Chart, Deployment, Ingress, Service } from "~/constructs";

interface MinioChartProps extends ChartProps {
  url: string;
  credentialsSecretName: string;
  clusterIssuerName?: string;
}

export class MinioChart extends Chart {
  svc: KubeService;

  constructor(
    scope: Construct,
    id: string,
    { url, credentialsSecretName, clusterIssuerName, ...props }: MinioChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "minio" };

    new KubeNamespace(this, "namespace", {
      metadata: { name: this.namespace },
    });

    const deployment = new Deployment(this, "deployment", {
      selector,
      containers: [
        {
          name: "minio",
          image: "quay.io/minio/minio",
          args: ["server", "/data", "--console-address", ":9001"],
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
          hostPath: { path: config.cache("minio"), type: "DirectoryOrCreate" },
        },
      ],
    });

    this.svc = Service.fromDeployment(this, "service", deployment);

    new Ingress(this, "ingress", {
      hostName: url,
      clusterIssuerName,
    }).addPath({ path: "/", name: this.svc.name, port: "console" });

    new Ingress(this, "api-ingress", {
      hostName: `api.${url}`,
      clusterIssuerName,
    }).addPath({ path: "/", name: this.svc.name, port: "api" });
  }
}
