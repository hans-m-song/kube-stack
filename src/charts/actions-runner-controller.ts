import { Construct } from "constructs";
import {
  HorizontalRunnerAutoscaler,
  RunnerDeployment,
} from "@/actions.summerwind.dev";
import { config } from "~/config";
import { Chart, ChartProps, Ingress, volumeHostPath } from "~/constructs";
import { Application } from "@/argoproj.io";
import { Yaml } from "cdk8s";

export interface ActionsRunnerControllerChartProps extends ChartProps {
  targets: { organization?: string; repository?: string }[];
  webhookUrl: string;
  runnerImage: string;
  targetRevision: string;
}

export class ActionsRunnerControllerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      targets,
      webhookUrl,
      runnerImage,
      targetRevision,
      ...props
    }: ActionsRunnerControllerChartProps
  ) {
    super(scope, id, props);

    new Application(this, "actions-runner-controller", {
      metadata: {},
      spec: {
        project: "default",
        source: {
          targetRevision,
          repoUrl:
            "https://actions-runner-controller.github.io/actions-runner-controller",
          chart: "actions-runner-controller",
          helm: {
            values: Yaml.stringify({
              authSecret: {
                create: true,
                github_token: "foo",
              },
              githubWebhookServer: {
                enabled: true,
                ports: [{ nodePort: 33080 }],
              },
            }),
          },
        },
        destination: {
          namespace: "actions-runner-system",
          name: "in-cluster",
        },
      },
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
      name: "actions-runner-controller-github-webhook-server",
      port: "http",
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
                dockerMtu: 1400,
                image: runnerImage,
                ...(organization && { organization }),
                ...(repository && { repository }),
                env: [
                  // go
                  { name: "GOPATH", value: `${cacheDir}/go` },
                  { name: "GOMODCACHE", value: `${cacheDir}/go/pkg/mod` },
                  // node
                  { name: "YARN_CACHE_FOLDER", value: `${cacheDir}/yarn` },
                ],
                volumeMounts: [
                  { name: "go-cache", mountPath: `${cacheDir}/go` },
                  { name: "yarn-cache", mountPath: `${cacheDir}/yarn` },
                ],
                volumes: [
                  volumeHostPath("go-cache", config.cache("arc/go-cache")),
                  volumeHostPath("yarn-cache", config.cache("arc/yarn-cache")),
                ],
              },
            },
          },
        }
      );
    });
  }
}
