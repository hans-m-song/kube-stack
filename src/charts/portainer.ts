import {
  KubePersistentVolume,
  KubePersistentVolumeClaim,
  Quantity,
} from "@/k8s";
import { Construct } from "constructs";
import { config } from "~/config";
import { Chart, ChartProps } from "~/constructs";
import { Helm } from "~/constructs/helm";
import { slug } from "~/utils";

interface PortainerChartProps extends ChartProps {
  url: string;
  helmVersion: string;
  clusterIssuerName?: string;
}

export class PortainerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, helmVersion, clusterIssuerName, ...props }: PortainerChartProps
  ) {
    super(scope, id, props);

    const pv = new KubePersistentVolume(this, "pv", {
      spec: {
        hostPath: { path: config.cache("portainer") },
        storageClassName: "local-path",
        accessModes: ["ReadWriteOnce"],
        capacity: { storage: Quantity.fromString("1Gi") },
      },
    });

    const pvc = new KubePersistentVolumeClaim(this, "pvc", {
      spec: {
        volumeName: pv.name,
        accessModes: ["ReadWriteOnce"],
        resources: { requests: { storage: Quantity.fromString("1Gi") } },
      },
    });

    new Helm(this, "portainer", {
      namespace: props.namespace,
      chart: "portainer/portainer",
      releaseName: "portainer",
      version: helmVersion,
      values: {
        service: { type: "ClusterIP" },
        ingress: {
          enabled: true,
          annotations: {
            "kubernetes.io/ingress.class": "traefik",
            ...(clusterIssuerName && {
              "cert-manager.io/cluster-issuer": clusterIssuerName,
            }),
          },
          hosts: [{ host: url, paths: [{ path: "/" }] }],
          tls: [{ secretName: `${slug(url)}-tls`, hosts: [url] }],
        },
        persistence: { enabled: true, existingClaim: pvc.name },
        tls: { existingSecret: `${slug(url)}-tls` },
      },
    });
  }
}
