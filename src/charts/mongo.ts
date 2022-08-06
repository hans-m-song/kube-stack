import { KubeService } from "@/k8s";
import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  Ingress,
  Service,
  volumeHostPath,
} from "~/constructs";

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
      volumes: [volumeHostPath("data", config.cache("mongo"))],
    });

    this.svc = Service.fromDeployment(this, deployment);

    new Ingress(this, "ingress", { hostName: url, clusterIssuerName }).addPath({
      path: "/",
      name: this.svc.name,
      port: "console",
    });
  }
}
