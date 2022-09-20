import {
  IntOrString,
  KubeDeploymentProps,
  KubeService,
  KubeServiceProps,
} from "@/k8s";
import { Construct } from "constructs";
import { Deployment } from "./deployment";

export interface ServiceProps extends KubeServiceProps {
  selector?: Record<string, string>;
  type?: string;
  ports?: { name: string; port: number }[];
}

export class ExternalServiceName extends KubeService {
  name: string;

  private static getEndpoint(serviceName: string, namespace?: string) {
    return [serviceName, namespace, "svc.cluster.local"]
      .filter(Boolean)
      .join(".");
  }

  constructor(scope: Construct, id: string, props: KubeServiceProps) {
    if (!props.spec?.externalName) {
      throw new Error("must specify spec.externalName");
    }

    super(scope, id, props);
    this.name = props.spec.externalName;
  }

  static fromServiceAttributes(
    scope: Construct,
    id: string,
    serviceName: string,
    namespace?: string
  ) {
    const endpoint = this.getEndpoint(serviceName, namespace);
    return new ExternalServiceName(scope, id, {
      spec: { type: "ExternalName", externalName: endpoint },
    });
  }

  static fromService<Service extends KubeService>(
    scope: Construct,
    id: string,
    service: Service
  ) {
    return this.fromServiceAttributes(
      scope,
      id,
      service.name,
      service.metadata.namespace
    );
  }
}

export class Service extends KubeService {
  static fromDeployment(scope: Construct, deployment: Deployment, id?: string) {
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

    return new Service(scope, id ?? `${deployment.node.id}-service`, {
      spec: { selector, ports },
    });
  }
}
