import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { KubeConfigMap, KubeCronJob, KubeNamespace } from "@/k8s";
import { Chart } from "~/constructs";

export interface DynamicDNSChartProps extends ChartProps {
  credentialsSecretName: string;
}

export class DynamicDNSChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { credentialsSecretName, ...props }: DynamicDNSChartProps
  ) {
    super(scope, id, props);

    new KubeNamespace(this, "namespace", {
      metadata: { name: props.namespace },
    });

    const config = new KubeConfigMap(this, "config", {
      data: {
        TZ: "Australia/Brisbane",
        LOG_LEVEL: "info",
        LOG_JSON: "false",
      },
    });

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
                      { configMapRef: { name: config.name } },
                      { secretRef: { name: credentialsSecretName } },
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
}
