import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { Chart, Ingress } from "~/constructs";

interface ArgoCDChartProps extends ChartProps {
  url: string;
  clusterIssuerName?: string;
}

export class ArgoCDChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, clusterIssuerName, ...props }: ArgoCDChartProps
  ) {
    super(scope, id, props);

    new Ingress(this, "ingress", { hostName: url, clusterIssuerName }).addPath({
      path: "/",
      pathType: "Prefix",
      name: "argocd-server",
      port: "http",
    });
  }
}
