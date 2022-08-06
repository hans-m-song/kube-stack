import { Construct } from "constructs";
import { ArgoCDApp, Chart, ChartProps } from "~/constructs";
import { slug } from "~/utils";

interface PortainerChartProps extends ChartProps {
  url: string;
  targetRevision: string;
  clusterIssuerName?: string;
}

export class PortainerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, targetRevision, clusterIssuerName, ...props }: PortainerChartProps
  ) {
    super(scope, id, props);

    new ArgoCDApp(this, "portainer", {
      spec: {
        project: "default",
        source: {
          targetRevision,
          repoUrl: "https://portainer.github.io/k8s/",
          chart: "portainer",
          helm: {
            values: {
              service: { type: "ClusterIP" },
              ingress: {
                enabled: true,
                annotations: {
                  "kubernetes.io/ingress.class": "traefik",
                  ...(clusterIssuerName && {
                    "cert-manager.io/cluster-issuer": clusterIssuerName,
                  }),
                },
                hosts: [{ host: url, paths: [{ path: "/" }] }],
                tls: [{ secretName: `${slug(url)}-tls`, hosts: [url] }],
              },
            },
          },
        },
        destination: {
          namespace: "portainer",
          name: "in-cluster",
        },
      },
    });
  }
}
