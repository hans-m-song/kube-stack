import { JsonPatch } from "cdk8s";
import { Construct } from "constructs";
import { KubeConfigMap, KubeCronJob } from "@/k8s";
import { config } from "~/config";
import { Chart, ChartProps, Secret } from "~/constructs";

export interface DynamicDNSChartProps extends ChartProps {
  targets?: string[];
}

export class DynamicDNSChart extends Chart {
  private targets: string[] = [];
  private config: KubeConfigMap;

  constructor(
    scope: Construct,
    id: string,
    { targets, ...props }: DynamicDNSChartProps
  ) {
    super(scope, id, props);

    const credentials = new Secret(this, "credentials", {
      data: {
        DDNSR53_CREDENTIALS_ACCESSKEYID: config.ddns.r53CredentialsAccesskeyid,
        DDNSR53_CREDENTIALS_SECRETACCESSKEY:
          config.ddns.r53CredentialsSecretaccesskey,
        DDNSR53_ROUTE53_HOSTEDZONEID: config.ddns.r53Route53Hostedzoneid,
      },
    });

    this.config = new KubeConfigMap(this, "config", {
      data: {
        TZ: "Australia/Brisbane",
        LOG_LEVEL: "info",
        LOG_JSON: "false",
      },
    });

    if (targets) {
      this.addTargets(targets);
    }

    new KubeCronJob(this, "cronjob", {
      spec: {
        schedule: "0 0 * * *",
        successfulJobsHistoryLimit: 1,
        failedJobsHistoryLimit: 1,
        jobTemplate: {
          spec: {
            template: {
              spec: {
                restartPolicy: "OnFailure",
                containers: [
                  {
                    name: "update-dns",
                    image: "crazymax/ddns-route53",
                    envFrom: [
                      { configMapRef: { name: this.config.name } },
                      { secretRef: { name: credentials.name } },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    });
  }

  addTarget(name: string) {
    const prefix = `/data/DDNSR53_ROUTE53_RECORDSSET_${this.targets.length}`;
    this.config.addJsonPatch(
      JsonPatch.add(`${prefix}_NAME`, name),
      JsonPatch.add(`${prefix}_TTL`, "300"),
      JsonPatch.add(`${prefix}_TYPE`, "A")
    );
    this.targets.push(name);
    return this;
  }

  addTargets(names: string[]) {
    names.forEach((name) => this.addTarget(name));
    return this;
  }
}
