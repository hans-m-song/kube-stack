import { Construct } from "constructs";
import {
  HorizontalRunnerAutoscaler,
  RunnerDeployment,
} from "@/actions.summerwind.dev";
import { config } from "~/config";
import { ArgoCDApp, Chart, ChartProps, Ingress, volumePVC } from "~/constructs";
import { NFSProvisionerChart } from "./nfs-provisioner";

export interface ActionsRunnerControllerChartProps extends ChartProps {
  targets: { organization?: string; repository?: string }[];
  webhookUrl: string;
  targetRevision: string;
  clusterIssuerName?: string;
  nfs: NFSProvisionerChart;
}

export class ActionsRunnerControllerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      nfs,
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

    targets.map(({ organization, repository }) => {
      if ((!organization && !repository) || (organization && repository)) {
        throw new Error(
          "must specify exactly one of 'organization' or 'repository'"
        );
      }

      const id = (organization ?? repository ?? "").replace(/\//g, "-");
      return new RunnerDeployment(this, `${id}-rd`, {
        spec: {
          template: {
            spec: {
              dockerMtu: 1400,
              image: config.prefetch("public.ecr.aws/axatol/gha-runner:latest"),
              ...(organization && { organization }),
              ...(repository && { repository }),
              env: [
                // go
                {
                  name: "GOPATH",
                  value: "/home/runner/.cache/go",
                },
                {
                  name: "GOMODCACHE",
                  value: "/home/runner/.cache/go/pkg/mod",
                },
                // node
                {
                  name: "YARN_CACHE_FOLDER",
                  value: "/home/runner/.cache/yarn",
                },
              ],
              volumeMounts: [
                { name: "go-cache", mountPath: "/home/runner/.cache/go" },
                { name: "yarn-cache", mountPath: "/home/runner/.cache/yarn" },
              ],
              volumes: [
                volumePVC(
                  "go-cache",
                  nfs.createPVC(this, `${id}-go-cache`, "5Gi").name
                ),
                volumePVC(
                  "yarn-cache",
                  nfs.createPVC(this, `${id}-yarn-cache`, "5Gi").name
                ),
              ],
            },
          },
        },
      });
    });
  }
}
