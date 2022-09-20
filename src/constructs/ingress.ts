import { KubeIngress, HttpIngressPath } from "@/k8s";
import { JsonPatch } from "cdk8s";
import { Construct } from "constructs";
import { slug } from "~/utils";

export interface IngressProps {
  hostName: string;
  clusterIssuerName?: string;
}

export class Ingress extends KubeIngress {
  constructor(
    scope: Construct,
    id: string,
    { hostName, clusterIssuerName }: IngressProps
  ) {
    super(scope, id, {
      metadata: {
        annotations: {
          "kubernetes.io/ingress.class": "traefik",
          ...(clusterIssuerName && {
            "cert-manager.io/cluster-issuer": clusterIssuerName,
          }),
        },
      },
      spec: {
        ...(clusterIssuerName && {
          tls: [{ hosts: [hostName], secretName: slug(`${hostName}-tls`) }],
        }),
        rules: [{ host: hostName, http: { paths: [] } }],
      },
    });
  }

  addPath(spec: {
    path: string;
    pathType?: string;
    name: string;
    port: string | number;
  }) {
    const path: HttpIngressPath = {
      path: spec.path,
      pathType: spec.pathType ?? "ImplementationSpecific",
      backend: {
        service: {
          name: spec.name,
          port:
            typeof spec.port === "string"
              ? { name: spec.port }
              : { number: spec.port },
        },
      },
    };
    this.addJsonPatch(JsonPatch.add("/spec/rules/0/http/paths/-", path));
    return this;
  }
}
