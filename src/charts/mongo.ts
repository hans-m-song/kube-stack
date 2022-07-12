import { KubeNamespace, KubeService } from "@/k8s";
import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { config } from "~/config";
import { Chart, Deployment, Ingress, Service } from "~/constructs";

interface MongoChartProps extends ChartProps {
  url: string;
  credentialsSecretName: string;
  clusterIssuerName?: string;
}

export class MongoChart extends Chart {
  svc: KubeService;

  constructor(
    scope: Construct,
    id: string,
    { url, credentialsSecretName, clusterIssuerName, ...props }: MongoChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "mongo" };

    new KubeNamespace(this, "namespace", {
      metadata: { name: this.namespace },
    });

    const deployment = new Deployment(this, "deployment", {
      selector,
      containers: [
        {
          name: "mongo",
          image: "mongo",
          ports: [{ containerPort: 27017, name: "api" }],
          envFrom: [{ secretRef: { name: credentialsSecretName } }],
          volumeMounts: [{ name: "data", mountPath: "/data/db" }],
        },
        {
          name: "mongo-express",
          image: "mongo-express",
          command: ["/bin/bash", "-c", "sleep 10s && node app"],
          ports: [{ containerPort: 8081, name: "console" }],
          envFrom: [{ secretRef: { name: credentialsSecretName } }],
          env: [{ name: "ME_CONFIG_MONGODB_SERVER", value: "localhost" }],
        },
      ],
      volumes: [
        {
          name: "data",
          hostPath: { path: config.cache("mongo"), type: "DirectoryOrCreate" },
        },
      ],
    });

    this.svc = Service.fromDeployment(this, "service", deployment);

    new Ingress(this, "ingress", { hostName: url }).addPath({
      path: "/",
      name: this.svc.name,
      port: "console",
    });
  }
}
