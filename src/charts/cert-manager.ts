import { Construct } from "constructs";
import { ClusterIssuer } from "@/cert-manager.io";
import { ArgoCDApp, Chart, ChartProps, Secret } from "~/constructs";
import { slug } from "~/utils";
import { config } from "~/config";

export interface CertManagerChartProps extends ChartProps {
  targetRevision: string;
}

export class CertManagerChart extends Chart {
  clusterIssuerPrd: ClusterIssuer;
  clusterIssuerStg: ClusterIssuer;

  constructor(
    scope: Construct,
    id: string,
    { targetRevision, ...props }: CertManagerChartProps
  ) {
    super(scope, id, props);

    new Secret(this, "aws-credentials", {
      metadata: { name: "aws-credentials" },
      data: { aws_secret_access_key: config.certManager.awsSecretAccessKey },
    });

    new ArgoCDApp(this, "cert-manager", {
      spec: {
        project: "default",
        source: {
          targetRevision,
          repoUrl: "https://charts.jetstack.io",
          chart: "cert-manager",
          helm: { values: { installCRDs: true } },
        },
        destination: {
          name: "in-cluster",
          namespace: "cert-manager",
        },
      },
    });

    this.clusterIssuerStg = this.createIssuer(
      "stg",
      "https://acme-staging-v02.api.letsencrypt.org/directory"
    );

    this.clusterIssuerPrd = this.createIssuer(
      "prd",
      "https://acme-v02.api.letsencrypt.org/directory"
    );
  }

  private createIssuer(name: string, server: string) {
    const id = `cluster-issuer-${slug(name)}`;
    return new ClusterIssuer(this, id, {
      spec: {
        acme: {
          server,
          email: config.certManager.email,
          privateKeySecretRef: { name: id },
          solvers: [
            {
              dns01: {
                route53: {
                  region: "ap-southeast-2",
                  accessKeyId: "AKIATXEPOOLUTMZWBSVC",
                  hostedZoneId: "Z067173715955IHMKKU3W",
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
