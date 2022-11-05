import { Construct } from "constructs";
import {
  Chart,
  ChartProps,
  Deployment,
  Ingress,
  volumePVC,
} from "~/constructs";
import { NFSChart } from "./nfs";

interface RegistryChartProps extends ChartProps {
  url: string;
  clusterIssuerName?: string;
}

export class RegistryChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, clusterIssuerName, ...props }: RegistryChartProps
  ) {
    super(scope, id, props);
    const nfs = NFSChart.of(this);

    const deployment = new Deployment(this, "nexus", {
      selector: { app: "nexus" },
      containers: [
        {
          name: "nexus",
          image: "sonatype/nexus3:3.42.0",
          ports: [{ name: "http", containerPort: 8081 }],
          volumeMounts: [{ name: "data", mountPath: "/nexus-data" }],
        },
      ],
      volumes: [volumePVC("data", nfs.persistentPVC(this, "data", "5Gi").name)],
    });

    const service = deployment.getService(this);

    new Ingress(this, "ingress", { hostName: url, clusterIssuerName }).addPath({
      path: "/",
      name: service.name,
      port: "http",
    });
  }
}
