import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  ExternalServiceName,
  Secret,
  volumePVC,
} from "~/constructs";
import { NFSChart } from "./nfs";

export interface HuiShengChartProps extends ChartProps {
  minioServiceName: string;
  botPrefix?: string;
}

export class HuiShengChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { minioServiceName, botPrefix, ...props }: HuiShengChartProps
  ) {
    super(scope, id, props);
    const nfs = NFSChart.of(this);
    const selector = { app: "huisheng" };

    const credentials = new Secret(this, "credentials", {
      data: {
        DISCORD_BOT_TOKEN: config.huisheng.discordBotToken,
        DISCORD_CLIENT_ID: config.huisheng.discordClientId,
        MINIO_ACCESS_KEY: config.huisheng.minioAccessKey,
        MINIO_SECRET_KEY: config.huisheng.minioSecretKey,
        YOUTUBE_API_KEY: config.huisheng.youtubeApiKey,
      },
    });

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
          image: config.prefetch("public.ecr.aws/axatol/huisheng:latest"),
          securityContext: { capabilities: { add: ["SYS_NICE"] } },
          env: [
            { name: "DISCORD_BOT_PREFIX", value: botPrefix ?? ">" },
            { name: "CACHE_DIR", value: "/data" },
            { name: "MINIO_ENDPOINT", value: minioEndpoint },
            { name: "MINIO_ENDPOINT_PORT", value: "9000" },
            { name: "MINIO_ENDPOINT_SSL", value: "false" },
          ],
          envFrom: [{ secretRef: { name: credentials.name } }],
          volumeMounts: [{ name: "data", mountPath: "/data" }],
        },
      ],
      volumes: [
        volumePVC("data", nfs.persistentPVC(this, "huisheng-data", "5Gi").name),
      ],
    });
  }
}
