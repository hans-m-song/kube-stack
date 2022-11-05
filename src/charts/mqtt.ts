import { IntOrString } from "@/k8s";
import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  Service,
  volumeHostPath,
} from "~/constructs";

interface MqttChartProps extends ChartProps {
  nodePort: number;
}

export class MQTTChart extends Chart {
  deployment = new Deployment(this, "deployment", {
    selector: { app: "mqtt" },
    containers: [
      {
        name: "mqtt-broker",
        image: "eclipse-mosquitto",
        ports: [{ name: "mqtt", containerPort: 1883 }],
        volumeMounts: [
          { name: "config", mountPath: "/mosquitto/config" },
          { name: "data", mountPath: "/mosquitto/data" },
          { name: "log", mountPath: "/mosquitto/log" },
        ],
      },
    ],
    volumes: [
      volumeHostPath("config", config.cache("mqtt/config")),
      volumeHostPath("data", config.cache("mqtt/data")),
      volumeHostPath("log", config.cache("mqtt/log")),
    ],
  });

  service = this.deployment.getService(this);

  nodePort: number;

  constructor(
    scope: Construct,
    id: string,
    { nodePort, ...props }: MqttChartProps
  ) {
    super(scope, id, props);

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
