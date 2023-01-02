import { IntOrString } from "@/k8s";
import { Construct } from "constructs";
import * as path from "path";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  envVarSecretRef,
  Ingress,
  Secret,
  volumeHostPath,
  volumePVC,
} from "~/constructs";
import { NFSChart } from "./nfs";

interface HomeAssistantChartProps extends ChartProps {
  url: string;
  mqttUrl: string;
  clusterIssuerName?: string;
  zigbeeHWBridgeId: string;
  zigbeeUrl?: string;
}

export class HomeAssistantChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    {
      url,
      mqttUrl,
      clusterIssuerName,
      zigbeeHWBridgeId,
      zigbeeUrl,
      ...props
    }: HomeAssistantChartProps
  ) {
    super(scope, id, props);

    const nfs = NFSChart.of(this);

    const credentials = new Secret(this, "credentials", {
      data: {
        EUFY_USERNAME: config.hass.eufyUsername,
        EUFY_PASSWORD: config.hass.eufyPassword,
      },
    });

    const cacheDir = (subdir: string) =>
      path.join(config.cache("home-assistant"), subdir);

    const eufy = new Deployment(this, "eufy-security", {
      selector: { app: "eufy-security" },
      containers: [
        {
          name: "eufy-security",
          image: "bropat/eufy-security-ws:0.9.2",
          ports: [{ name: "ws", containerPort: 3000 }],
          env: [
            { name: "COUNTRY", value: "AU" },
            { name: "DEBUG", value: "1" },
            envVarSecretRef(credentials.name, "EUFY_USERNAME", "USERNAME"),
            envVarSecretRef(credentials.name, "EUFY_PASSWORD", "PASSWORD"),
          ],
        },
      ],
    });

    eufy.getService(this);

    const zigbee = new Deployment(this, "zigbee2mqtt", {
      selector: { app: "zigbee2mqtt" },
      containers: [
        {
          name: "zigbee2mqtt",
          image: "koenkk/zigbee2mqtt:1.28.0",
          securityContext: {
            privileged: true,
            // runAsUser: 20,
            // runAsGroup: 20, // dialout
          },
          env: [
            { name: "TZ", value: config.tz },
            { name: "ZIGBEE2MQTT_CONFIG_HOMEASSISTANT", value: "true" },
            {
              name: "ZIGBEE2MQTT_CONFIG_MQTT_SERVER",
              value: "tcp://k8s.axatol.xyz:31883",
            },
            { name: "ZIGBEE2MQTT_CONFIG_FRONTEND", value: "true" },
            { name: "ZIGBEE2MQTT_CONFIG_SERIAL_ADAPTER", value: "ezsp" },
            { name: "ZIGBEE2MQTT_CONFIG_SERIAL_PORT", value: "/dev/ttyACM0" },
          ],
          ports: [{ containerPort: 8080 }],
          volumeMounts: [
            { name: "data", mountPath: "/app/data" },
            { name: "zbdongle-e", mountPath: "/dev/ttyACM0" },
            // { name: "udev", mountPath: "udev" },
          ],
        },
      ],
      volumes: [
        volumePVC(
          "data",
          nfs.persistentPVC(this, "zigbee2mqtt-data", "1Gi").name
        ),
        volumeHostPath(
          "zbdongle-e",
          `/dev/serial/by-id/${zigbeeHWBridgeId}`,
          ""
        ),
        // volumeHostPath("udev", "/run/udev", ""),
      ],
    });

    zigbeeUrl &&
      new Ingress(this, "zigbee-ingress", { hostName: zigbeeUrl }).addPath({
        path: "/",
        name: zigbee.getService(this).name,
        port: 8080,
      });

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
                  [
                    "[ -f /config/custom_components/hacs ]",
                    "&&",
                    "wget -O - https://get.hacs.xyz | bash -",
                    "||",
                    "true",
                  ].join(" "),
                ],
              },
            },
          },
        },

        // addons
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
        volumeHostPath("config", cacheDir("config")),
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
