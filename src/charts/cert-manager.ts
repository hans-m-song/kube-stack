import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { ClusterIssuer } from "@/cert-manager.io";
import { KubeNamespace } from "@/k8s";
import { Chart } from "~/utils";

export interface CertManagerChartProps extends ChartProps {
  email: string;
}

export class CertManagerChart extends Chart {
  clusterIssuerPrd: ClusterIssuer;
  clusterIssuerStg: ClusterIssuer;

  constructor(
    scope: Construct,
    id: string,
    { email, ...props }: CertManagerChartProps
  ) {
    super(scope, id, props);

    new KubeNamespace(this, "namespace", {
      metadata: { name: props.namespace },
    });

    this.clusterIssuerStg = new ClusterIssuer(this, "cluster-issuer-stg", {
      spec: {
        acme: {
          server: "https://acme-staging-stg.api.letsencrypt.org/directory",
          email,
          privateKeySecretRef: { name: "cluster-issuer-stg" },
          solvers: [{ http01: { ingress: { class: "nginx" } } }],
        },
      },
    });

    this.clusterIssuerPrd = new ClusterIssuer(this, "cluster-issuer-prd", {
      spec: {
        acme: {
          server: "https://acme-v02.api.letsencrypt.org/directory",
          email,
          privateKeySecretRef: { name: "cluster-issuer-prd" },
          solvers: [{ http01: { ingress: { class: "nginx" } } }],
        },
      },
    });
  }
}
