import { KubeNamespace, KubeNamespaceProps } from "@/k8s";
import { Construct } from "constructs";

export interface NamespaceProps extends KubeNamespaceProps {
  name: string;
}

export class Namespace extends KubeNamespace {
  constructor(
    scope: Construct,
    id: string,
    { name, ...props }: NamespaceProps
  ) {
    super(scope, id, { ...props, metadata: { ...props.metadata, name } });
  }
}
