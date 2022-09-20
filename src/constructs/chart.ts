import {
  ApiObject,
  Chart as Cdk8sChart,
  ChartProps as Cdk8sChartProps,
  Names,
} from "cdk8s";
import { Construct, IConstruct } from "constructs";
import { Namespace } from "./namespace";

const search = (construct: IConstruct, symbol: symbol): IConstruct | null => {
  if (symbol in construct) {
    return construct;
  }

  for (const child of construct.node.children) {
    const match = search(child, symbol);
    if (match) {
      return match;
    }
  }

  return null;
};

export interface ChartProps extends Cdk8sChartProps {
  namespace: string;
  createNamespace?: boolean;
}

export class Chart extends Cdk8sChart {
  readonly props: ChartProps;
  readonly ns?: Namespace;

  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, props);
    this.props = { createNamespace: true, ...props };
    if (this.props.createNamespace && this.props.namespace !== "kube-system") {
      this.ns = new Namespace(this, "namespace", { name: props.namespace });
    }
  }

  static search(construct: IConstruct, symbol: symbol) {
    if (symbol in construct) {
      console.log("Chart.search", "matched given construct", construct.node.id);
      return construct;
    }

    const result = search(construct.node.root, symbol);
    if (!result) {
      throw new Error(
        `could not find contruct with symbol ${symbol.toString()}`
      );
    }

    return result;
  }

  generateObjectName(apiObject: ApiObject): string {
    // name without hash
    const name = Names.toDnsLabel(apiObject, { includeHash: false });
    // name without (redundant) object id
    return name.replace(RegExp(`^${this.node.id}-`), "");
  }
}
