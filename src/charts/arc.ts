import { Construct } from "constructs";
import {
  HorizontalRunnerAutoscaler,
  RunnerDeployment,
} from "@/actions.summerwind.dev";
import { config } from "~/config";
import { Chart, ChartProps, Ingress, volumePVC } from "~/constructs";
import { NFSChart } from "./nfs";
import { Helm } from "~/constructs/helm";

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

    const nfs = NFSChart.of(this);

    new Helm(this, "actions-runner-controller", {
      namespace: props.namespace,
      chart: "actions-runner-controller/actions-runner-controller",
      releaseName: "actions-runner-controller",
      values: {
        authSecret: { create: true, github_token: config.arc.githubPAT },
        githubWebhookServer: { enabled: true },
      },
    });

    new HorizontalRunnerAutoscaler(this, "horizontalrunnerautoscaler", {
      spec: {
        minReplicas: 0,
        maxReplicas: targets.length * 2,
        scaleUpTriggers: [
          {
            githubEvent: { workflowJob: {} },
            amount: 1,
            duration: "5m",
          },
        ],
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

    const toolPVC = nfs.createPVC(this, "tool-cache", "5Gi", "persistent", {
      accessModes: ["ReadWriteMany"],
    });

    const modulePVC = nfs.createPVC(this, "module-cache", "5Gi", "persistent", {
      accessModes: ["ReadWriteMany"],
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
              dockerdWithinRunnerContainer: true,
              image: config.prefetch("public.ecr.aws/axatol/gha-runner:latest"),
              organization,
              repository,
              env: [
                {
                  name: "DISABLE_RUNNER_UPDATE",
                  value: "true",
                },
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
                  name: "npm_config_cache",
                  value: "/home/runner/.cache/npm",
                },
                {
                  name: "YARN_CACHE_FOLDER",
                  value: "/home/runner/.cache/yarn",
                },
              ],
              volumeMounts: [
                { name: "tool-cache", mountPath: "/opt/hostedtoolcache" },
                {
                  name: "module-cache",
                  mountPath: "/home/runner/.cache",
                },
              ],
              volumes: [
                volumePVC("tool-cache", toolPVC.name),
                volumePVC("module-cache", modulePVC.name),
              ],
            },
          },
        },
      });
    });
  }
}
