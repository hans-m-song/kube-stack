import { Construct } from "constructs";
import {
  HorizontalRunnerAutoscaler,
  HorizontalRunnerAutoscalerSpecScaleTargetRefKind,
  RunnerDeployment,
} from "@/actions.summerwind.dev";
import { config } from "~/config";
import { Chart, ChartProps, Ingress, volumePVC } from "~/constructs";
import { NFSChart } from "./nfs";
import { Helm } from "~/constructs/helm";
import { KubeRoleBinding, KubeServiceAccount } from "@/k8s";

export interface RunnerTarget {
  organization?: string;
  repository?: string;
  maxReplicas?: number;
  authorizedNamespaces?: string[];
}

export interface ActionsRunnerControllerChartProps extends ChartProps {
  targets: RunnerTarget[];
  webhookUrl: string;
  helmVersion: string;
  clusterIssuerName?: string;
}

export class ActionsRunnerControllerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      targets,
      webhookUrl,
      helmVersion,
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
      version: helmVersion,
      values: {
        authSecret: { create: true, github_token: config.arc.githubPAT },
        githubWebhookServer: { enabled: true },
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

    targets.map((target) => {
      const {
        organization,
        repository,
        maxReplicas = 3,
        authorizedNamespaces,
      } = target;

      if ((!organization && !repository) || (organization && repository)) {
        throw new Error(
          "must specify exactly one of 'organization' or 'repository'"
        );
      }

      const id = (organization ?? repository ?? "").replace(/\//g, "-");

      const serviceAccount =
        authorizedNamespaces && new KubeServiceAccount(this, `${id}-sa`);

      serviceAccount &&
        authorizedNamespaces?.forEach((namespace) => {
          const sa = new KubeServiceAccount(this, `${namespace}-${id}-sa`, {
            metadata: { name: serviceAccount.name, namespace },
          });

          new KubeRoleBinding(this, `${serviceAccount.node.id}-rb`, {
            metadata: { namespace },
            roleRef: { apiGroup: "", kind: "ClusterRole", name: "edit" },
            subjects: [{ kind: "ServiceAccount", name: sa.name }],
          });
        });

      const runnerDeployment = new RunnerDeployment(this, `${id}-rd`, {
        spec: {
          template: {
            spec: {
              serviceAccountName: serviceAccount?.name,
              dockerMtu: 1400,
              dockerdWithinRunnerContainer: true,
              image: config.prefetch(
                "public.ecr.aws/axatol/github-actions-runner:latest"
              ),
              imagePullPolicy: "Always",
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
                {
                  name: "tool-cache",
                  mountPath: "/opt/hostedtoolcache",
                },
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

      new HorizontalRunnerAutoscaler(this, `${id}-hra`, {
        spec: {
          minReplicas: 0,
          maxReplicas,
          scaleTargetRef: {
            kind: HorizontalRunnerAutoscalerSpecScaleTargetRefKind.RUNNER_DEPLOYMENT,
            name: runnerDeployment.name,
          },
          scaleUpTriggers: [
            {
              githubEvent: { workflowJob: {} },
              amount: 1,
              duration: "5m",
            },
          ],
        },
      });
    });
  }
}
