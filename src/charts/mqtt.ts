import { IntOrString } from "@/k8s";
import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  Service,
  volumePVC,
} from "~/constructs";
import { NFSChart } from "./nfs";

interface MqttChartProps extends ChartProps {
  nodePort: number;
}

export class MQTTChart extends Chart {
  deployment: Deployment;
  service: Service;
  nodePort: number;

  constructor(
    scope: Construct,
    id: string,
    { nodePort, ...props }: MqttChartProps
  ) {
    super(scope, id, props);

    const nfs = NFSChart.of(this);

    const pvc = nfs.persistentPVC(this, "data", "1Gi");

    this.deployment = new Deployment(this, "deployment", {
      selector: { app: "mqtt" },
      containers: [
        {
          name: "mqtt-broker",
          image: "eclipse-mosquitto",
          ports: [{ name: "mqtt", containerPort: 1883 }],
          volumeMounts: [
            {
              name: "data",
              mountPath: "/mosquitto/config",
              subPath: "config",
            },
            {
              name: "data",
              mountPath: "/mosquitto/data",
              subPath: "data",
            },
            {
              name: "data",
              mountPath: "/mosquitto/log",
              subPath: "log",
            },
          ],
        },
      ],
      volumes: [volumePVC("data", pvc.name)],
    });

    this.service = this.deployment.getService(this);

    this.nodePort = nodePort;

    new Service(this, "service", {
      spec: {
        type: "NodePort",
        selector: { app: "mqtt" },
        ports: [
          { port: 1883, targetPort: IntOrString.fromString("mqtt"), nodePort },
        ],
      },
    });
  }
}
