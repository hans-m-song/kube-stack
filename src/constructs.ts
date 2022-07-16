import {
  EnvVar,
  HttpIngressPath,
  IntOrString,
  KubeDeployment,
  KubeDeploymentProps,
  KubeIngress,
  KubeService,
  KubeServiceProps,
  PodSpec,
  Volume,
} from "@/k8s";
import { ApiObject, Chart as Cdk8sChart, JsonPatch, Names } from "cdk8s";
import { Construct } from "constructs";
import { slug } from "./utils";

export const envVarSecretRef = (
  secretName: string,
  key: string,
  name = key
): EnvVar => ({
  name,
  valueFrom: { secretKeyRef: { key, name: secretName } },
});

export const volumeHostPath = (
  name: string,
  hostPath: string,
  type = "DirectoryOrCreate"
): Volume => ({ name, hostPath: { path: hostPath, type } });

export class Chart extends Cdk8sChart {
  generateObjectName(apiObject: ApiObject): string {
    return Names.toDnsLabel(apiObject, { includeHash: false });
  }
}

export interface ServiceProps extends KubeServiceProps {
  selector?: Record<string, string>;
  type?: string;
  ports?: { name: string; port: number }[];
}

export class Service extends KubeService {
  static fromExternalServiceName(
    scope: Construct,
    id: string,
    selector: Record<string, string>,
    serviceName: string,
    namespace?: string
  ) {
    const endpoint = [serviceName, namespace, "svc.cluster.local"]
      .filter(Boolean)
      .join(".");
    const service = new Service(scope, id, {
      spec: { selector, type: "ExternalName", externalName: endpoint },
    });

    return { endpoint, service };
  }

  static fromDeployment(scope: Construct, id: string, deployment: Deployment) {
    const spec: KubeDeploymentProps = deployment.toJson();
    const selector = spec.spec?.selector.matchLabels;
    const ports =
      spec.spec?.template.spec?.containers
        .map((container) => container.ports)
        .flat()
        .filter((value): value is Exclude<typeof value, undefined> => !!value)
        .map((spec) => ({
          name: spec.name,
          port: spec.containerPort,
          targetPort: IntOrString.fromNumber(spec.containerPort),
        })) ?? [];

    return new Service(scope, id, { spec: { selector, ports } });
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

export interface DeploymentProps extends PodSpec {
  selector: Record<string, string>;
}

export class Deployment extends KubeDeployment {
  constructor(
    scope: Construct,
    id: string,
    { selector, ...spec }: DeploymentProps
  ) {
    super(scope, id, {
      spec: {
        selector: { matchLabels: selector },
        template: { metadata: { labels: selector }, spec },
      },
    });
  }

  getService(scope: Construct, name: string) {
    return Service.fromDeployment(scope, name, this);
  }
}
