import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  Service,
  volumeHostPath,
} from "~/constructs";

interface MosquittoChartProps extends ChartProps {
  url: string;
}

export class MosquittoChart extends Chart {
  service: Service;

  constructor(
    scope: Construct,
    id: string,
    { url, ...props }: MosquittoChartProps
  ) {
    super(scope, id, props);

    const deployment = new Deployment(this, "mosquitto", {
      selector: { app: "mosquitto" },
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
        volumeHostPath("config", config.cache("mosquitto/config")),
        volumeHostPath("data", config.cache("mosquitto/data")),
        volumeHostPath("log", config.cache("mosquitto/log")),
      ],
    });

    this.service = deployment.getService(this);
  }
}
