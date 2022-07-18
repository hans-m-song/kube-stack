import { IntOrString, KubeNamespace } from "@/k8s";
import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  Deployment,
  envVarSecretRef,
  Ingress,
  volumeHostPath,
} from "~/constructs";

interface HomeAssistantChartProps extends ChartProps {
  url: string;
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
      ...props
    }: HomeAssistantChartProps
  ) {
    super(scope, id, props);

    new KubeNamespace(this, "namespace", {
      metadata: { name: props.namespace },
    });

    const deployment = new Deployment(this, "deployment", {
      selector: { app: "home-assistant" },
      containers: [
        {
          name: "home-assistant",
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
        {
          name: "eufy-security",
          image: "bropat/eufy-security-ws:0.9.2",
          ports: [{ name: "ws", containerPort: 3000 }],
          env: [
            { name: "COUNTRY", value: "AU" },
            // { name: "DEBUG", value: "1" },
            envVarSecretRef(credentialsSecretName, "EUFY_USERNAME", "USERNAME"),
            envVarSecretRef(credentialsSecretName, "EUFY_PASSWORD", "PASSWORD"),
          ],
        },
        {
          name: "rtsp-server",
          image: "aler9/rtsp-simple-server",
          env: [{ name: "RTSP_PROTOCOLS", value: "tcp" }],
          ports: [
            { name: "rtsp", containerPort: 8554 },
            { name: "rtmp", containerPort: 1935 },
          ],
        },
        {
          name: "mqtt-broker",
          image: "eclipse-mosquitto",
          ports: [{ name: "mqtt", containerPort: 1883 }],
          volumeMounts: [
            { name: "mosquittoconfig", mountPath: "/mosquitto/config" },
            { name: "mosquittodata", mountPath: "/mosquitto/data" },
            { name: "mosquittolog", mountPath: "/mosquitto/log" },
          ],
        },
      ],
      volumes: [
        volumeHostPath("config", config.cache("home-assistant/config")),
        { name: "localtime", hostPath: { path: "/etc/localtime" } },
        volumeHostPath(
          "mosquittoconfig",
          config.cache("home-assistant/mosquitto/config")
        ),
        volumeHostPath(
          "mosquittodata",
          config.cache("home-assistant/mosquitto/data")
        ),
        volumeHostPath(
          "mosquittolog",
          config.cache("home-assistant/mosquitto/log")
        ),
      ],
    });

    const service = deployment.getService(this, "service");

    new Ingress(this, "ingress", { hostName: url, clusterIssuerName }).addPath({
      path: "/",
      name: service.name,
      port: "console",
    });
  }
}
