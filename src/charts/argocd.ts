import { Construct } from "constructs";
import { ArgoCDApp, Chart, ChartProps } from "~/constructs";
import { slug } from "~/utils";

interface ArgoCDChartProps extends ChartProps {
  url: string;
  targetRevision: string;
  clusterIssuerName?: string;
}

export class ArgoCDChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, targetRevision, clusterIssuerName, ...props }: ArgoCDChartProps
  ) {
    super(scope, id, props);

    new ArgoCDApp(this, "argocd", {
      spec: {
        source: {
          repoUrl: "https://argoproj.github.io/argo-helm",
          chart: "argo-cd",
          targetRevision,
          helm: {
            values: {
              dex: { enabled: false },
              server: {
                extraArgs: ["--insecure"],
                config: { "accounts.argocd": "login" },
                ingress: {
                  enabled: true,
                  annotations: {
                    "kubernetes.io/ingress.class": "traefik",
                    ...(clusterIssuerName && {
                      "cert-manager.io/cluster-issuer": clusterIssuerName,
                    }),
                  },
                  hosts: [url],
                  tls: [{ secretName: `${slug(url)}-tls`, hosts: [url] }],
                },
              },
            },
          },
        },
      },
    });
  }
}
