import { Construct } from "constructs";
import { config } from "~/config";
import { Chart, ChartProps } from "~/constructs";
import { Helm } from "~/constructs/helm";

export interface NewRelicChartProps extends ChartProps {
  helmVersion: string;
}

export class NewRelicChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { helmVersion, ...props }: NewRelicChartProps
  ) {
    super(scope, id, props);

    new Helm(this, "nri-bundle", {
      namespace: props.namespace,
      chart: "newrelic/nri-bundle",
      version: helmVersion,
      values: {
        global: {
          licenseKey: config.newrelic.licenseKey,
          cluster: config.newrelic.clusterName,
          lowDataMode: true,
        },
        "kube-state-metrics": {
          enabled: false,
        },
        "newrelic-infrastructure": {
          privileged: true,
        },
        "newrelic-logging": {
          enabled: true,
        },
        "nri-kube-events": {
          enabled: true,
        },
        "nri-metadata-injection": {
          enabled: true,
        },
        "nri-prometheus": {
          enabled: false,
        },
      },
    });
  }
}
