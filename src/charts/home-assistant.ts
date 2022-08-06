import { IntOrString } from "@/k8s";
import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  ExternalServiceName,
  Ingress,
  volumeHostPath,
} from "~/constructs";

interface HomeAssistantChartProps extends ChartProps {
  url: string;
  mqttServiceName: string;
  credentialsSecretName: string;
  clusterIssuerName?: string;
}

export class HomeAssistantChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      url,
      credentialsSecretName,
      clusterIssuerName,
      mqttServiceName,
      ...props
    }: HomeAssistantChartProps
  ) {
    super(scope, id, props);

    ExternalServiceName.fromServiceAttributes(this, "mqtt", mqttServiceName);

    const deployment = new Deployment(this, "deployment", {
      selector: { app: `${this.node.id}` },
      containers: [
        {
          name: `${this.node.id}`,
          image: "ghcr.io/home-assistant/home-assistant:stable",
          ports: [{ name: "console", containerPort: 8123 }],
          volumeMounts: [
            { name: "config", mountPath: "/config" },
            { name: "localtime", mountPath: "/etc/localtime", readOnly: true },
          ],
          readinessProbe: {
            initialDelaySeconds: 3,
            httpGet: { port: IntOrString.fromNumber(8123) },
          },
          lifecycle: {
            postStart: {
              exec: {
                command: [
                  "/bin/bash",
                  "-c",
                  "[ -f /config/custom_components/hacs ] && wget -O - https://get.hacs.xyz | bash - || true",
                ],
              },
            },
          },
        },

        // addons
        // {
        //   name: "eufy-security",
        //   image: "bropat/eufy-security-ws:0.9.2",
        //   ports: [{ name: "ws", containerPort: 3000 }],
        //   env: [
        //     { name: "COUNTRY", value: "AU" },
        //     { name: "DEBUG", value: "1" },
        //     envVarSecretRef(credentialsSecretName, "EUFY_USERNAME", "USERNAME"),
        //     envVarSecretRef(credentialsSecretName, "EUFY_PASSWORD", "PASSWORD"),
        //   ],
        // },
        {
          name: "rtsp-server",
          image: "aler9/rtsp-simple-server",
          env: [{ name: "RTSP_PROTOCOLS", value: "tcp" }],
          ports: [
            { name: "rtsp", containerPort: 8554 },
            { name: "rtmp", containerPort: 1935 },
          ],
        },
      ],
      volumes: [
        volumeHostPath("config", config.cache("home-assistant/config")),
        { name: "localtime", hostPath: { path: "/etc/localtime" } },
      ],
    });

    const service = deployment.getService(this);

    new Ingress(this, "ingress", { hostName: url, clusterIssuerName }).addPath({
      path: "/",
      name: service.name,
      port: "console",
    });
  }
}
