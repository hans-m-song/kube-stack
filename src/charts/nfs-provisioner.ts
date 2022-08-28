import { KubePersistentVolumeClaim, NfsVolumeSource, Quantity } from "@/k8s";
import { Construct } from "constructs";
import { ArgoCDApp, Chart, ChartProps } from "~/constructs";

export interface NFSProvisionerChartProps extends ChartProps {
  targetRevision: string;
  nfsServer: string;
  nfsPath: string;
}

export class NFSProvisionerChart extends Chart {
  private nfs: NfsVolumeSource;

  constructor(
    scope: Construct,
    id: string,
    { targetRevision, nfsServer, nfsPath, ...props }: NFSProvisionerChartProps
  ) {
    super(scope, id, { ...props, createNamespace: false });
    this.nfs = { server: nfsServer, path: nfsPath };

    new ArgoCDApp(this, "nfs-subdir-external-provisioner", {
      spec: {
        source: {
          repoUrl:
            "https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/",
          chart: "nfs-subdir-external-provisioner",
          targetRevision,
          helm: {
            values: {
              storageClass: {
                name: "nfs",
                reclaimPolicy: "Retain",
                pathPattern: "${.PVC.namespace}-${.PVC.name}",
              },
              nfs: this.nfs,
            },
          },
        },
      },
    });
  }

  createPVC(
    scope: Construct,
    id: string,
    capacity: string,
    props: {
      accessModes?: string[];
      storageClassName?: string;
      volumeMode?: string;
    } = {}
  ) {
    const {
      accessModes = ["ReadWriteOnce"],
      storageClassName = "nfs",
      volumeMode = "Filesystem",
    } = props;
    const storage = Quantity.fromString(capacity);

    return new KubePersistentVolumeClaim(scope, `${id}-pvc`, {
      spec: {
        accessModes,
        storageClassName,
        volumeMode,
        resources: { requests: { storage } },
      },
    });
  }
}
