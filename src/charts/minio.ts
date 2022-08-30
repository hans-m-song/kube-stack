import { KubeService } from "@/k8s";

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
import { NFSProvisionerChart } from "./nfs-provisioner";

interface MinioChartProps extends ChartProps {
  nfs: NFSProvisionerChart;
  apiUrl: string;
  url: string;
  clusterIssuerName?: string;
}

export class MinioChart extends Chart {
  svc: KubeService;

  constructor(
    scope: Construct,
    id: string,
    { nfs, apiUrl, url, clusterIssuerName, ...props }: MinioChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "minio" };

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
          name: "minio",
          image: "quay.io/minio/minio",
          args: ["server", "/data", "--console-address", ":9001"],
          ports: [
            { containerPort: 9000, name: "api" },
            { containerPort: 9001, name: "console" },
          ],
          envFrom: [{ secretRef: { name: credentials.name } }],
          volumeMounts: [{ name: "data", mountPath: "/data" }],
        },
      ],
      volumes: [volumePVC("data", nfs.createPVC(this, "data", "20Gi").name)],
    });

    this.svc = Service.fromDeployment(this, deployment);

    new Ingress(this, "ingress", {
      hostName: url,
      clusterIssuerName,
    }).addPath({ path: "/", name: this.svc.name, port: "console" });

    new Ingress(this, "api-ingress", {
      hostName: apiUrl,
      clusterIssuerName,
    }).addPath({ path: "/", name: this.svc.name, port: "api" });
  }
}
