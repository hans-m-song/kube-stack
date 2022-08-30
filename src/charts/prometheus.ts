import { Construct } from "constructs";
import { ArgoCDApp, Chart, ChartProps } from "~/constructs";
import { slug } from "~/utils";

interface PrometheusChartProps extends ChartProps {
  grafanaUrl: string;
  targetRevision: string;
  clusterIssuerName?: string;
}

export class PrometheusChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      targetRevision,
      grafanaUrl,
      clusterIssuerName,
      ...props
    }: PrometheusChartProps
  ) {
    super(scope, id, props);

    new ArgoCDApp(this, "prometheus", {
      spec: {
        project: "default",
        source: {
          targetRevision,
          repoUrl: "https://prometheus-community.github.io/helm-charts",
          chart: "kube-prometheus-stack",
          helm: {
            values: {
              grafana: {
                ingress: {
                  enabled: true,
                  annotations: {
                    "kubernetes.io/ingress.class": "traefik",
                    ...(clusterIssuerName && {
                      "cert-manager.io/cluster-issuer": clusterIssuerName,
                    }),
                  },
                  hosts: [grafanaUrl],
                  paths: ["/"],
                  tls: [
                    {
                      secretName: `${slug(grafanaUrl)}-tls`,
                      hosts: [grafanaUrl],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });
  }
}
