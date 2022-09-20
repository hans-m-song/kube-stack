import { Application, ApplicationProps } from "@/argoproj.io";
import { Yaml } from "cdk8s";
import { Construct } from "constructs";
import { Chart, ChartProps } from "~/constructs";
import { slug } from "~/utils";

const ARGO_CD_CHART_SYMBOL = Symbol.for("@kube-stack/charts.ArgoCD");

interface ArgoCDChartProps extends ChartProps {
  url: string;
  targetRevision: string;
}

export class ArgoCDChart extends Chart {
  static of(construct: Construct): ArgoCDChart {
    return Chart.search(construct, ARGO_CD_CHART_SYMBOL) as ArgoCDChart;
  }

  constructor(
    scope: Construct,
    id: string,
    { url, targetRevision, ...props }: ArgoCDChartProps
  ) {
    super(scope, id, props);
    Object.defineProperty(this, ARGO_CD_CHART_SYMBOL, { value: true });

    this.helmApp(
      this,
      {
        repoUrl: "https://argoproj.github.io/argo-helm",
        chart: "argo-cd",
        targetRevision,
      },
      {
        dex: {
          enabled: false,
        },
        server: {
          extraArgs: ["--insecure"],
          ingress: {
            enabled: true,
            annotations: {
              "kubernetes.io/ingress.class": "traefik",
            },
            hosts: [url],
            tls: [{ secretName: `${slug(url)}-tls`, hosts: [url] }],
          },
          config: { "accounts.argocd": "login" },
          rbacConfig: {
            "policy.default": "role:readonly",
            "policy.csv": ["g, argocd, role:admin"].join("\n"),
          },
        },
      }
    );
  }

  helmApp(
    scope: Construct,
    helm: {
      repoUrl: string;
      chart: string;
      targetRevision: string;
    },
    values?: Record<string, unknown>,
    props?: ApplicationProps
  ): Application {
    const { repoUrl, chart, targetRevision } = helm;

    return new Application(scope, helm.chart, {
      metadata: {
        name: helm.chart,
        namespace: this.namespace,
        ...props?.metadata,
      },
      spec: {
        project: "default",
        ...props?.spec,
        source: {
          repoUrl,
          chart,
          targetRevision,
          ...props?.spec.source,
          helm: {
            ...props?.spec.source.helm,
            values: Yaml.stringify(values),
          },
        },
        destination: {
          name: "in-cluster",
          namespace: Chart.of(scope).namespace,
          ...props?.spec.destination,
        },
      },
    });
  }
}
