import { Construct } from "constructs";
import { config } from "~/config";
import { Chart, ChartProps } from "~/constructs";
import { Helm } from "~/constructs/helm";

export class NewRelicChart extends Chart {
  constructor(scope: Construct, id: string, props: ChartProps) {
    super(scope, id, props);

    new Helm(this, "nri-bundle", {
      namespace: props.namespace,
      chart: "newrelic/nri-bundle",
      values: {
        global: {
          licenseKey: config.newrelic.licenseKey,
          cluster: config.newrelic.clusterName,
        },
        "kube-state-metrics": {
          enabled: true,
        },
        "newrelic-infrastructure": {
          priviledged: true,
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
          enabled: true,
        },
      },
    });
  }
}
