import { Construct } from "constructs";
import {
  HorizontalRunnerAutoscaler,
  RunnerDeployment,
} from "@/actions.summerwind.dev";
import { config } from "~/config";
import { Chart, ChartProps, Ingress, volumePVC } from "~/constructs";
import { NFSProvisionerChart } from "./nfs-provisioner";
import { ArgoCDChart } from "./argocd";

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

    const nfs = NFSProvisionerChart.of(this);

    ArgoCDChart.of(this).helmApp(
      this,
      {
        repoUrl:
          "https://actions-runner-controller.github.io/actions-runner-controller",
        chart: "actions-runner-controller",
        targetRevision,
      },
      {
        authSecret: { create: true, github_token: config.arc.githubPAT },
        githubWebhookServer: {
          enabled: true,
          ports: [{ nodePort: 33080 }],
        },
      }
    );

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

    const goPVC = nfs.createPVC(this, "go-cache", "5Gi", "persistent", {
      accessModes: ["ReadWriteMany"],
    });

    const npmPVC = nfs.createPVC(this, "npm-cache", "5Gi", "persistent", {
      accessModes: ["ReadWriteMany"],
    });

    const yarnPVC = nfs.createPVC(this, "yarn-cache", "5Gi", "persistent", {
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
                { name: "DISABLE_RUNNER_UPDATE", value: "true" },
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
                {
                  name: "go-cache",
                  mountPath: "/home/runner/.cache/go",
                },
                {
                  name: "npm-cache",
                  mountPath: "/home/runner/.cache/npm",
                },
                {
                  name: "yarn-cache",
                  mountPath: "/home/runner/.cache/yarn",
                },
              ],
              volumes: [
                volumePVC("go-cache", goPVC.name),
                volumePVC("npm-cache", npmPVC.name),
                volumePVC("yarn-cache", yarnPVC.name),
              ],
            },
          },
        },
      });
    });
  }
}
