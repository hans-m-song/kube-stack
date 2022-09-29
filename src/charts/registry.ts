import { Yaml } from "cdk8s";
import { Construct } from "constructs";
import { config } from "~/config";
import { Chart, ChartProps, Deployment, Ingress, Secret } from "~/constructs";
import { MinioChart } from "./minio";

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
    const minio = MinioChart.of(this);

    const { name: minioEndpoint } = minio.externalServiceName(
      this,
      "minio-service"
    );

    const configuration = new Secret(this, "configuration", {
      data: {
        "config.yml": Yaml.stringify({
          version: 0.1,
          log: { level: "debug", formatter: "text" },
          loglevel: "debug",
          storage: {
            s3: {
              accesskey: config.registry.s3.accessKeyID,
              secretkey: config.registry.s3.secretAccessKey,
              region: "us-east-1",
              regionendpoint: `http://${minioEndpoint}:9000`,
              bucket: "docker",
              // encrypt: false,
              // keyid: "",
              // secure: true,
              // v4auth: true,
              // chunksize: 5242880,
              // rootdirectory: "/",
            },
            delete: { enabled: true },
            maintenance: {
              uploadpurging: {
                enabled: true,
                age: "168h",
                interval: "24h",
                dryrun: false,
              },
              readonly: { enabled: false },
            },
          },
          http: { addr: ":5000" },
          proxy: { remoteurl: "https://registry-1.docker.io" },
        }),
      },
    });

    const deployment = new Deployment(this, "deployment", {
      selector: { app: "registry" },
      containers: [
        {
          name: "registry",
          image: "registry:2",
          ports: [{ name: "http", containerPort: 5000 }],
          volumeMounts: [
            {
              name: "config",
              mountPath: "/etc/docker/registry/config.yml",
              subPath: "config.yml",
            },
          ],
        },
      ],
      volumes: [{ name: "config", secret: { secretName: configuration.name } }],
    });

    const service = deployment.getService(this);

    new Ingress(this, "ingress", { hostName: url, clusterIssuerName }).addPath({
      path: "/",
      name: service.name,
      port: "http",
    });
  }
}
