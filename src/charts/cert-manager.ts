import { Construct } from "constructs";
import { ClusterIssuer } from "@/cert-manager.io";
import { Chart, ChartProps } from "~/constructs";
import { slug } from "~/utils";
import { Application } from "@/argoproj.io";
import { Yaml } from "cdk8s";

export interface CertManagerDNSTarget {
  region: string;
  accessKeyId: string;
  hostedZoneId: string;
}

export interface CertManagerChartProps extends ChartProps {
  email: string;
  targetRevision: string;
}

export class CertManagerChart extends Chart {
  clusterIssuerPrd: ClusterIssuer;
  clusterIssuerStg: ClusterIssuer;

  constructor(
    scope: Construct,
    id: string,
    { email, targetRevision, ...props }: CertManagerChartProps
  ) {
    super(scope, id, props);

    new Application(this, "cert-manager", {
      metadata: {},
      spec: {
        project: "default",
        source: {
          targetRevision,
          repoUrl: "https://charts.jetstack.io",
          chart: "cert-manager",
          helm: { values: Yaml.stringify({ installCRDs: true }) },
        },
        destination: {
          name: "in-cluster",
          namespace: "cert-manager",
        },
      },
    });

    this.clusterIssuerStg = this.createIssuer(
      "stg",
      "https://acme-staging-v02.api.letsencrypt.org/directory",
      email
    );

    this.clusterIssuerPrd = this.createIssuer(
      "prd",
      "https://acme-v02.api.letsencrypt.org/directory",
      email
    );
  }

  private createIssuer(name: string, server: string, email: string) {
    const id = `cluster-issuer-${slug(name)}`;
    return new ClusterIssuer(this, id, {
      spec: {
        acme: {
          server,
          email,
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
