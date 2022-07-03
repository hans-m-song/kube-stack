import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { ClusterIssuer } from "@/cert-manager.io";
import { KubeNamespace } from "@/k8s";
import { Chart } from "~/constructs";
import { slug } from "~/utils";

export interface CertManagerDNSTarget {
  region: string;
  accessKeyId: string;
  hostedZoneId: string;
}

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
