import {
  Container,
  HttpIngressPath,
  IntOrString,
  KubeDeployment,
  KubeDeploymentProps,
  KubeIngress,
  KubeService,
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

export interface ServiceProps {
  selector: Record<string, string>;
  type?: string;
  ports: { name: string; port: number }[];
}

export class Service extends KubeService {
  static fromDeployment(scope: Construct, id: string, deployment: Deployment) {
    const spec: KubeDeploymentProps = deployment.toJson();
    const selector = spec.spec?.selector.matchLabels;
    const ports = spec.spec?.template.spec?.containers
      .map((container) => container.ports)
      .flat()
      .filter((value): value is Exclude<typeof value, undefined> => !!value)
      .map((spec) => ({ name: spec.name, port: spec.containerPort }))
      .filter((spec): spec is ServiceProps["ports"][0] => !!spec.name);

    if (!selector) {
      throw new Error("could not infer selector");
    }

    if (!ports) {
      throw new Error("could not infer ports");
    }

    return new Service(scope, id, { selector, ports });
  }

  constructor(
    scope: Construct,
    id: string,
    { selector, type = "ClusterIP", ports }: ServiceProps
  ) {
    super(scope, id, {
      spec: {
        selector,
        type,
        ports: ports.map(({ name, port }) => ({
          name,
          port,
          targetPort: IntOrString.fromString(name),
        })),
      },
    });
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
