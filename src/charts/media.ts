import { Container, EnvVar } from "@/k8s";
import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  Ingress,
  volumePVC,
} from "~/constructs";
import { NFSChart } from "./nfs";

export interface MediaChartProps extends ChartProps {
  subdomain: string;
  clusterIssuerName?: string;
}

export class MediaChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { subdomain, clusterIssuerName, ...props }: MediaChartProps
  ) {
    super(scope, id, props);
    const nfs = NFSChart.of(this);

    const claims = {
      config: nfs.persistentPVC(this, "config", "1Gi", {
        accessModes: ["ReadWriteMany"],
      }),
      data: nfs.persistentPVC(this, "data", "10Gi", {
        accessModes: ["ReadWriteMany"],
      }),
    };

    const commonEnv: EnvVar[] = [
      { name: "TZ", value: config.tz },
      { name: "PUID", value: "2000" },
      { name: "GUID", value: "2000" },
    ];

    const containers: Record<string, Container> = {
      jackett: {
        name: "jackett",
        image: "lscr.io/linuxserver/jackett",
        env: [...commonEnv],
        volumeMounts: [
          { name: "config", mountPath: "/config", subPath: "jackett" },
        ],
        ports: [{ name: "jackettweb", containerPort: 9117 }],
      },

      qbt: {
        name: "qbittorrent",
        image: "lscr.io/linuxserver/qbittorrent",
        env: [...commonEnv],
        volumeMounts: [
          { name: "config", mountPath: "/config", subPath: "qbt" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "qbtweb", containerPort: 8080 }],
      },

      sonarr: {
        name: "sonarr",
        image: "lscr.io/linuxserver/sonarr",
        env: [...commonEnv],
        volumeMounts: [
          { name: "config", mountPath: "/config", subPath: "sonarr" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "sonarrweb", containerPort: 8989 }],
      },

      radarr: {
        name: "radarr",
        image: "lscr.io/linuxserver/radarr",
        env: [...commonEnv],
        volumeMounts: [
          { name: "config", mountPath: "/config", subPath: "radarr" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "radarrweb", containerPort: 7878 }],
      },

      lidarr: {
        name: "lidarr",
        image: "lscr.io/linuxserver/lidarr",
        env: [...commonEnv],
        volumeMounts: [
          { name: "config", mountPath: "/config", subPath: "lidarr" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "lidarrweb", containerPort: 8686 }],
      },

      jellyfin: {
        name: "jellyfin",
        image: "lscr.io/linuxserver/jellyfin",
        env: [...commonEnv],
        volumeMounts: [
          { name: "config", mountPath: "/config", subPath: "jellyfin" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "jellyfinweb", containerPort: 8096 }],
      },
    };

    const initClaim = (claimName: string): Container => ({
      name: `chown-${claimName}`,
      image: "busybox:stable",
      command: ["/bin/chown", "-R", "$(PUID):$(GUID)", "/data"],
      env: [...commonEnv],
      volumeMounts: [{ name: claimName, mountPath: "/data" }],
    });

    const deployment = new Deployment(this, "deployment", {
      selector: { app: "media" },
      initContainers: Object.keys(claims).map(initClaim),
      containers: Object.values(containers),
      volumes: Object.entries(claims).map(([name, claim]) =>
        volumePVC(name, claim.name)
      ),
    });

    const svc = deployment.getService(this);

    Object.entries(containers).map(([name, container]) => {
      const port = container.ports?.find((port) => port.name?.includes("web"));
      if (!port) {
        return null;
      }

      return new Ingress(this, name, {
        hostName: config.url(`${name}.${subdomain}`),
        // clusterIssuerName,
      }).addPath({
        path: "/",
        name: svc.name,
        port: port.name ?? port.containerPort,
      });
    });
  }
}
