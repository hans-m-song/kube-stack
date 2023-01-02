import { Construct } from "constructs";
import { Chart, ChartProps } from "~/constructs";
import { Helm } from "~/constructs/helm";
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

    new Helm(this, "kube-prometheus-stack", {
      namespace: props.namespace,
      chart: "prometheus-community/kube-prometheus-stack",
      releaseName: "prometheus",
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
            tls: clusterIssuerName && [
              {
                secretName: `${slug(grafanaUrl)}-tls`,
                hosts: [grafanaUrl],
              },
            ],
          },
        },
      },
    });
  }
}
