import { Construct } from "constructs";
import { KubeCronJob } from "@/k8s";
import { slug } from "~/utils";
import { Chart, ChartProps } from "~/constructs";

export interface PrefetchChartProps extends ChartProps {
  images: string[];
}

export class PrefetchChart extends Chart {
  cronJob: KubeCronJob;

  constructor(
    scope: Construct,
    id: string,
    { images, ...props }: PrefetchChartProps
  ) {
    super(scope, id, props);

    this.cronJob = new KubeCronJob(this, "cronjob", {
      spec: {
        schedule: "*/5 * * * *",
        successfulJobsHistoryLimit: 1,
        failedJobsHistoryLimit: 1,
        jobTemplate: {
          spec: {
            template: {
              spec: {
                restartPolicy: "OnFailure",
                containers: images.map((image) => ({
                  name: slug(image),
                  image,
                  command: ["true"],
                })),
              },
            },
          },
        },
      },
    });
  }
}
