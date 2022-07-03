import { IntOrString, KubeNamespace, KubeService } from "@/k8s";
import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { config } from "~/config";
import { Chart, Deployment, Ingress } from "~/constructs";

interface MinioChartProps extends ChartProps {
  url: string;
  credentialsSecretName: string;
  clusterIssuerName: string;
}

export class MinioChart extends Chart {
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

    new Deployment(this, "deployment", {
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

    const svc = new KubeService(this, "service", {
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

    new Ingress(this, "ingress", {
      hostName: config.url("minio.k8s"),
      clusterIssuerName,
    }).addPath({
      path: "/",
      pathType: "ImplementationSpecific",
      backend: {
        service: { name: svc.name, port: { name: "console" } },
      },
    });

    new Ingress(this, "api-ingress", {
      hostName: config.url("api.minio.k8s"),
      clusterIssuerName,
    }).addPath({
      path: "/",
      pathType: "ImplementationSpecific",
      backend: {
        service: { name: svc.name, port: { name: "api" } },
      },
    });
  }
}
