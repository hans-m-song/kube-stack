import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import {
  HorizontalRunnerAutoscaler,
  RunnerDeployment,
} from "@/actions.summerwind.dev";
import { KubeNamespace } from "@/k8s";
import { config } from "~/config";
import { Chart, Ingress } from "~/constructs";

export interface ActionsRunnerControllerChartProps extends ChartProps {
  targets: { organization?: string; repository?: string }[];
  webhookUrl: string;
  runnerImage: string;
}

export class ActionsRunnerControllerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      targets,
      webhookUrl,
      runnerImage,
      ...props
    }: ActionsRunnerControllerChartProps
  ) {
    super(scope, id, props);

    new KubeNamespace(this, "namespace", {
      metadata: { name: props.namespace },
    });

    new HorizontalRunnerAutoscaler(this, "horizontalrunnerautoscaler", {
      spec: {
        scaleUpTriggers: [{ amount: 1, duration: "5m" }],
        minReplicas: 0,
        maxReplicas: targets.length * 2,
      },
    });

    new Ingress(this, "ingress", { hostName: webhookUrl }).addPath({
      pathType: "Exact",
      path: "/webhook",
      backend: {
        service: {
          name: "actions-runner-controller-github-webhook-server",
          port: { name: "http" },
        },
      },
    });

    const cacheDir = "/home/runner/.cache";

    targets.map(({ organization, repository }) => {
      if ((!organization && !repository) || (organization && repository)) {
        throw new Error(
          "must specify exactly one of 'organization' or 'repository'"
        );
      }

      return new RunnerDeployment(
        this,
        `${(organization ?? repository ?? "").replace(/\//g, "-")}-rd`,
        {
          spec: {
            template: {
              spec: {
                image: runnerImage,
                ...(organization && { organization }),
                ...(repository && { repository }),
                volumeMounts: [
                  { name: "var-lib-docker", mountPath: "/var/lib/docker" },
                  { name: "go-cache", mountPath: `${cacheDir}/go` },
                  { name: "yarn-cache", mountPath: `${cacheDir}/yarn` },
                ],
                env: [
                  // go
                  { name: "GOPATH", value: `${cacheDir}/go` },
                  { name: "GOMODCACHE", value: `${cacheDir}/go/pkg/mod` },
                  // node
                  { name: "YARN_CACHE_FOLDER", value: `${cacheDir}/node/yarn` },
                ],
                volumes: [
                  {
                    name: "var-lib-docker",
                    hostPath: {
                      type: "DirectoryOrCreate",
                      path: "/var/lib/docker",
                    },
                  },
                  {
                    name: "go-cache",
                    hostPath: {
                      type: "DirectoryOrCreate",
                      path: config.cache("go-cache"),
                    },
                  },
                  {
                    name: "yarn-cache",
                    hostPath: {
                      type: "DirectoryOrCreate",
                      path: config.cache("yarn-cache"),
                    },
                  },
                ],
              },
            },
          },
        }
      );
    });
  }
}
