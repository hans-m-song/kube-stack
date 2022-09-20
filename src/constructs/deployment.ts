import { KubeDeployment, PodSpec } from "@/k8s";
import { Construct } from "constructs";
import { Service } from "./service";

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

  getService(scope: Construct, id?: string) {
    return Service.fromDeployment(scope, this, id);
  }
}
