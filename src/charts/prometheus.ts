import { Construct } from "constructs";
import { Chart, ChartProps } from "~/constructs";
import { slug } from "~/utils";
import { ArgoCDChart } from "./argocd";

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

    ArgoCDChart.of(this).helmApp(
      this,
      {
        targetRevision,
        repoUrl: "https://prometheus-community.github.io/helm-charts",
        chart: "kube-prometheus-stack",
      },
      {
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
            tls: clusterIssuerName && [
              {
                secretName: `${slug(grafanaUrl)}-tls`,
                hosts: [grafanaUrl],
              },
            ],
          },
        },
      }
    );
  }
}
