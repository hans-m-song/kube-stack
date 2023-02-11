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
import path from "path";

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

      const serviceAccount = new KubeServiceAccount(this, `${id}-sa`);

      authorizedNamespaces?.forEach((namespace) => {
        new KubeRoleBinding(this, `${serviceAccount.node.id}-rb`, {
          metadata: { namespace },
          roleRef: {
            apiGroup: "",
            kind: "ClusterRole",
            name: "edit",
          },
          subjects: [
            {
              kind: "ServiceAccount",
              name: serviceAccount.name,
              namespace: this.namespace,
            },
          ],
        });
      });

      const cacheDir = (subdir?: string) => {
        const dir = "/home/runner/.cache";
        return subdir ? path.join(dir, subdir) : dir;
      };

      const runnerDeployment = new RunnerDeployment(this, `${id}-rd`, {
        spec: {
          template: {
            spec: {
              serviceAccountName: serviceAccount.name,
              dockerMtu: 1400,
              dockerdWithinRunnerContainer: true,
              image: config.prefetch(
                "public.ecr.aws/axatol/github-actions-runner:latest"
              ),
              imagePullPolicy: "Always",
              organization,
              repository,
              env: [
                // runner
                // { name: "ACTIONS_RUNNER_PRINT_LOG_TO_STDOUT", value: "true" },
                { name: "DISABLE_RUNNER_UPDATE", value: "true" },
                // go
                { name: "GOPATH", value: cacheDir("go") },
                { name: "GOMODCACHE", value: cacheDir("go/pkg/mod") },
                // node
                { name: "npm_config_cache", value: cacheDir("npm") },
                { name: "YARN_CACHE_FOLDER", value: cacheDir("yarn") },
              ],
              volumeMounts: [
                { name: "tool-cache", mountPath: "/opt/hostedtoolcache" },
                { name: "module-cache", mountPath: cacheDir() },
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
