import { IntOrString, KubeService } from "@/k8s";
import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  Ingress,
  Secret,
  Service,
  volumePVC,
} from "~/constructs";
import { NFSChart } from "./nfs";

interface MongoChartProps extends ChartProps {
  url: string;
  clusterIssuerName?: string;
}

export class MongoChart extends Chart {
  svc: KubeService;

  constructor(
    scope: Construct,
    id: string,
    { url, clusterIssuerName, ...props }: MongoChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "mongo" };

    const pvc = NFSChart.of(this).persistentPVC(this, "data", "2Gi");

    const credentials = new Secret(this, "credentials", {
      data: {
        MINIO_ROOT_USER: config.minio.rootUser,
        MINIO_ROOT_PASSWORD: config.minio.rootPassword,
      },
    });

    const deployment = new Deployment(this, "deployment", {
      selector,
      containers: [
        {
          name: "mongo",
          image: "mongo",
          ports: [{ containerPort: 27017, name: "api" }],
          envFrom: [{ secretRef: { name: credentials.name } }],
          volumeMounts: [{ name: "data", mountPath: "/data/db" }],
        },
        {
          name: "mongo-express",
          image: "mongo-express",
          command: ["/bin/bash", "-c", "sleep 10s && node app"],
          ports: [{ containerPort: 8081, name: "console" }],
          envFrom: [{ secretRef: { name: credentials.name } }],
          env: [{ name: "ME_CONFIG_MONGODB_SERVER", value: "localhost" }],
        },
      ],
      volumes: [volumePVC("data", pvc.name)],
    });

    this.svc = Service.fromDeployment(this, deployment);

    new Service(this, "port", {
      spec: {
        selector,
        type: "NodePort",
        ports: [
          {
            port: 27017,
            targetPort: IntOrString.fromString("api"),
            nodePort: 32717,
          },
        ],
      },
    });

    new Ingress(this, "ingress", { hostName: url, clusterIssuerName }).addPath({
      path: "/",
      name: this.svc.name,
      port: "console",
    });
  }
}
