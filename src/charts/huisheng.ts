import { Construct } from "constructs";
import {
  Chart,
  ChartProps,
  Deployment,
  ExternalServiceName,
  volumeHostPath,
} from "~/constructs";

export interface HuiShengChartProps extends ChartProps {
  image: string;
  credentialsSecretName: string;
  minioServiceName: string;
  cachePath: string;
  botPrefix?: string;
}

export class HuiShengChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      image,
      credentialsSecretName,
      minioServiceName,
      cachePath,
      botPrefix,
      ...props
    }: HuiShengChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "huisheng" };

    const { name: minioEndpoint } = ExternalServiceName.fromServiceAttributes(
      this,
      "minio-service",
      minioServiceName
    );

    new Deployment(this, "deployment", {
      selector,
      containers: [
        {
          name: "huisheng",
          image,
          securityContext: { capabilities: { add: ["SYS_NICE"] } },
          env: [
            { name: "DISCORD_BOT_PREFIX", value: botPrefix ?? ">" },
            { name: "CACHE_DIR", value: "/data" },
            { name: "MINIO_ENDPOINT", value: minioEndpoint },
            { name: "MINIO_ENDPOINT_PORT", value: "9000" },
            { name: "MINIO_ENDPOINT_SSL", value: "false" },
          ],
          envFrom: [{ secretRef: { name: credentialsSecretName } }],
          volumeMounts: [{ name: "data", mountPath: "/data" }],
        },
      ],
      volumes: [volumeHostPath("data", cachePath)],
    });
  }
}
