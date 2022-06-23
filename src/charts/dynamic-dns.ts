import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { KubeCronJob, KubeNamespace } from "@/k8s";
import { Chart } from "~/utils";

export interface DynamicDNSChartProps extends ChartProps {
  hosts: string[];
}

export class DynamicDNSChart extends Chart {
  cronJob: KubeCronJob;

  constructor(
    scope: Construct,
    id: string,
    { hosts, ...props }: DynamicDNSChartProps
  ) {
    super(scope, id, props);

    new KubeNamespace(this, "namespace", {
      metadata: { name: props.namespace },
    });

    this.cronJob = new KubeCronJob(this, "cronjob", {
      spec: {
        schedule: "0 0 * * *",
        successfulJobsHistoryLimit: 1,
        failedJobsHistoryLimit: 1,
        jobTemplate: {
          spec: {
            template: {
              spec: {
                restartPolicy: "OnFailure",
                containers: hosts.map((host) => ({
                  name: "updater",
                  image: "curlimages/curl",
                  command: [
                    "curl",
                    `https://$(USER):$(PASS)@$(ENDPOINT)?hostname=${host}`,
                  ],
                  envFrom: [
                    { secretRef: { name: "credentials" } },
                    { configMapRef: { name: "config" } },
                  ],
                })),
              },
            },
          },
        },
      },
    });
  }
}
