import {
  Container,
  HttpIngressPath,
  KubeDeployment,
  KubeIngress,
  Volume,
} from "@/k8s";
import { ApiObject, Chart as Cdk8sChart, JsonPatch, Names } from "cdk8s";
import { Construct } from "constructs";
import { slug } from "./utils";

export class Chart extends Cdk8sChart {
  generateObjectName(apiObject: ApiObject): string {
    return Names.toDnsLabel(apiObject, { includeHash: false });
  }
}

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
        tls: [{ hosts: [hostName], secretName: slug(`${hostName}-tls`) }],
        rules: [{ host: hostName, http: { paths: [] } }],
      },
    });
  }

  addPath(path: HttpIngressPath) {
    this.addJsonPatch(JsonPatch.add("/spec/rules/0/http/paths/-", path));
    return this;
  }
}

export interface DeploymentProps {
  selector: Record<string, string>;
  containers: Container[];
  volumes?: Volume[];
}

export class Deployment extends KubeDeployment {
  constructor(
    scope: Construct,
    id: string,
    { selector, containers, volumes }: DeploymentProps
  ) {
    super(scope, id, {
      spec: {
        selector: { matchLabels: selector },
        template: {
          metadata: { labels: selector },
          spec: { containers, volumes },
        },
      },
    });
  }
}
