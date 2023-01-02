import { Helm as Cdk8sHelm, HelmProps as Cdk8sHelmProps } from "cdk8s";
import { Construct } from "constructs";

export interface HelmProps extends Cdk8sHelmProps {
  namespace?: string;
}

export class Helm extends Cdk8sHelm {
  constructor(
    scope: Construct,
    id: string,
    { namespace, ...props }: HelmProps
  ) {
    super(scope, id, {
      ...props,
      helmFlags: [
        ...(props.helmFlags ?? []),
        ...(namespace ? ["--namespace", namespace] : []),
      ],
    });
  }
}
