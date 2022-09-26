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
import { NFSProvisionerChart } from "./nfs-provisioner";

export interface MediaChartProps extends ChartProps {
  url: string;
}

export class MediaChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, ...props }: MediaChartProps
  ) {
    super(scope, id, props);
    const nfs = NFSProvisionerChart.of(this);

    const claims = {
      "jackett-config": nfs.persistentPVC(this, "jackett-config", "1Gi"),
      "qbt-config": nfs.persistentPVC(this, "qbt-config", "1Gi"),
      "sonarr-config": nfs.persistentPVC(this, "sonarr-config", "1Gi"),
      "radarr-config": nfs.persistentPVC(this, "radarr-config", "1Gi"),
      "lidarr-config": nfs.persistentPVC(this, "lidarr-config", "1Gi"),
      "jellyfin-config": nfs.persistentPVC(this, "jellyfin-config", "1Gi"),
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
        volumeMounts: [{ name: "jackett-config", mountPath: "/config" }],
        ports: [{ name: "jackettweb", containerPort: 9117 }],
      },

      qbt: {
        name: "qbittorrent",
        image: "lscr.io/linuxserver/qbittorrent",
        env: [...commonEnv],
        volumeMounts: [
          { name: "qbt-config", mountPath: "/config" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "qbtweb", containerPort: 8080 }],
      },

      sonarr: {
        name: "sonarr",
        image: "lscr.io/linuxserver/sonarr",
        env: [...commonEnv],
        volumeMounts: [
          { name: "sonarr-config", mountPath: "/config" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "sonarrweb", containerPort: 8989 }],
      },

      radarr: {
        name: "radarr",
        image: "lscr.io/linuxserver/radarr",
        env: [...commonEnv],
        volumeMounts: [
          { name: "radarr-config", mountPath: "/config" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "radarrweb", containerPort: 7878 }],
      },

      lidarr: {
        name: "lidarr",
        image: "lscr.io/linuxserver/lidarr",
        env: [...commonEnv],
        volumeMounts: [
          { name: "lidarr-config", mountPath: "/config" },
          { name: "data", mountPath: "/data" },
        ],
        ports: [{ name: "lidarrweb", containerPort: 8686 }],
      },

      jellyfin: {
        name: "jellyfin",
        image: "lscr.io/linuxserver/jellyfin",
        env: [...commonEnv],
        volumeMounts: [
          { name: "jellyfin-config", mountPath: "/config" },
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

      return new Ingress(this, name, { hostName: `${name}.${url}` }).addPath({
        path: "/",
        name: svc.name,
        port: port.name ?? port.containerPort,
      });
    });
  }
}
