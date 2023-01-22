import { Construct } from "constructs";
import { ClusterIssuer } from "@/cert-manager.io";
import { Chart, ChartProps, Secret } from "~/constructs";
import { slug } from "~/utils";
import { config } from "~/config";
import { Helm } from "~/constructs/helm";

const CERT_MANAGER_CHART_SYMBOL = Symbol.for("@kube-stack/charts.cert-manager");

export interface CertManagerChartProps extends ChartProps {
  helmVersion: string;
}

export class CertManagerChart extends Chart {
  static of(construct: Construct): CertManagerChart {
    return Chart.search(
      construct,
      CERT_MANAGER_CHART_SYMBOL
    ) as CertManagerChart;
  }

  clusterIssuerPrd: ClusterIssuer;
  clusterIssuerStg: ClusterIssuer;

  constructor(
    scope: Construct,
    id: string,
    { helmVersion, ...props }: CertManagerChartProps
  ) {
    super(scope, id, props);
    Object.defineProperty(this, CERT_MANAGER_CHART_SYMBOL, { value: true });

    new Helm(this, "cert-manager", {
      namespace: props.namespace,
      chart: "jetstack/cert-manager",
      releaseName: "cert-manager",
      version: helmVersion,
      values: { installCRDs: true },
    });

    new Secret(this, "aws-credentials", {
      metadata: { name: "aws-credentials" },
      data: { aws_secret_access_key: config.certManager.awsSecretAccessKey },
    });

    this.clusterIssuerStg = this.createIssuer(
      "stg",
      config.certManager.issuerStg
    );

    this.clusterIssuerPrd = this.createIssuer(
      "prd",
      config.certManager.issuerPrd
    );
  }

  private createIssuer(name: string, server: string) {
    const id = `cluster-issuer-${slug(name)}`;
    return new ClusterIssuer(this, id, {
      metadata: { name: id },
      spec: {
        acme: {
          server,
          email: config.certManager.email,
          privateKeySecretRef: { name: id },
          solvers: [
            {
              dns01: {
                route53: {
                  region: config.certManager.awsRegion,
                  accessKeyId: config.certManager.awsAccessKeyId,
                  hostedZoneId: config.certManager.awsHostedZoneId,
                  secretAccessKeySecretRef: {
                    name: "aws-credentials",
                    key: "aws_secret_access_key",
                  },
                },
              },
            },
          ],
        },
      },
    });
  }
}
