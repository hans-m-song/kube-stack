import {
  KubePersistentVolume,
  KubePersistentVolumeClaim,
  Quantity,
} from "@/k8s";
import { Construct } from "constructs";
import { config } from "~/config";
import { Chart, ChartProps } from "~/constructs";
import { slug } from "~/utils";
import { ArgoCDChart } from "./argocd";

interface PortainerChartProps extends ChartProps {
  url: string;
  targetRevision: string;
  clusterIssuerName?: string;
}

export class PortainerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, targetRevision, clusterIssuerName, ...props }: PortainerChartProps
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

    ArgoCDChart.of(this).helmApp(
      this,
      {
        targetRevision,
        repoUrl: "https://portainer.github.io/k8s/",
        chart: "portainer",
      },
      {
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
      }
    );
  }
}
