import { ServersTransport } from "@/traefik.containo.us";
import { Construct } from "constructs";
import { Chart, ChartProps, Ingress } from "~/constructs";

interface KubernetesDashboardChartProps extends ChartProps {
  url: string;
  clusterIssuerName?: string;
}

export class KubernetesDashboardChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, clusterIssuerName, ...props }: KubernetesDashboardChartProps
  ) {
    super(scope, id, props);

    const transport = new ServersTransport(this, "transport", {
      metadata: {},
      spec: { serverName: url, insecureSkipVerify: true },
    });

    const ingress = new Ingress(this, "ingress", {
      hostName: url,
      clusterIssuerName,
    }).addPath({
      path: "/dashboard",
      port: 443,
      name: "kubernetes-dashboard",
    });

    ingress.metadata.addAnnotation(
      "traefik.ingress.kubernetes.io/service.serverstransport",
      transport.name
    );
    ingress.metadata.addAnnotation(
      "nginx.ingress.kubernetes.io/ssl-redirect",
      "true"
    );
  }
}
