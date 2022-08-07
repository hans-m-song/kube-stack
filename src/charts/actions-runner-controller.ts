import { Construct } from "constructs";
import {
  HorizontalRunnerAutoscaler,
  RunnerDeployment,
} from "@/actions.summerwind.dev";
import { config } from "~/config";
import {
  ArgoCDApp,
  Chart,
  ChartProps,
  Ingress,
  volumeHostPath,
} from "~/constructs";
import path from "path";

export interface ActionsRunnerControllerChartProps extends ChartProps {
  targets: { organization?: string; repository?: string }[];
  webhookUrl: string;
  targetRevision: string;
  clusterIssuerName?: string;
}

export class ActionsRunnerControllerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      targets,
      webhookUrl,
      targetRevision,
      clusterIssuerName,
      ...props
    }: ActionsRunnerControllerChartProps
  ) {
    super(scope, id, props);

    new ArgoCDApp(this, "actions-runner-controller", {
      spec: {
        project: "default",
        source: {
          targetRevision,
          repoUrl:
            "https://actions-runner-controller.github.io/actions-runner-controller",
          chart: "actions-runner-controller",
          helm: {
            values: {
              authSecret: { create: true, github_token: config.arc.githubPAT },
              githubWebhookServer: {
                enabled: true,
                ports: [{ nodePort: 33080 }],
              },
            },
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

    new Ingress(this, "ingress", {
      hostName: webhookUrl,
      clusterIssuerName,
    }).addPath({
      pathType: "Exact",
      path: "/webhook",
      name: "actions-runner-controller-github-webhook-server",
      port: "http",
    });

    const runnerCache = (...names: string[]) =>
      path.join("/home/runner/.cache", ...names);
    const cacheDir = (...names: string[]) => config.cache("arc", ...names);

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
                image: config.prefetch(
                  "public.ecr.aws/axatol/gha-runner:latest"
                ),
                ...(organization && { organization }),
                ...(repository && { repository }),
                env: [
                  // go
                  { name: "GOPATH", value: runnerCache("go") },
                  { name: "GOMODCACHE", value: runnerCache("go/pkg/mod") },
                  // node
                  { name: "YARN_CACHE_FOLDER", value: runnerCache("yarn") },
                ],
                volumeMounts: [
                  { name: "go-cache", mountPath: runnerCache("go") },
                  { name: "yarn-cache", mountPath: runnerCache("yarn") },
                ],
                volumes: [
                  volumeHostPath("go-cache", cacheDir("go-cache")),
                  volumeHostPath("yarn-cache", cacheDir("yarn-cache")),
                ],
              },
            },
          },
        }
      );
    });
  }
}
