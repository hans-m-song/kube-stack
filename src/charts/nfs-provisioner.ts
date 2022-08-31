import { KubePersistentVolumeClaim, Quantity } from "@/k8s";
import { Construct } from "constructs";
import { ArgoCDApp, Chart, ChartProps } from "~/constructs";

export interface NFSProvisionerChartProps extends ChartProps {
  targetRevision: string;
  nfsServer: string;
  nfsPath: string;
}

export class NFSProvisionerChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { targetRevision, nfsServer, nfsPath, ...props }: NFSProvisionerChartProps
  ) {
    super(scope, id, { ...props, createNamespace: false });

    new ArgoCDApp(this, "nfs-subdir-external-provisioner", {
      spec: {
        source: {
          repoUrl:
            "https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/",
          chart: "nfs-subdir-external-provisioner",
          targetRevision,
          helm: {
            values: {
              nfs: {
                path: nfsPath,
                server: nfsServer,
                reclaimPolicy: "Retain",
              },
              storageClass: {
                create: true,
                name: "nfs-local",
                allowVolumeExpansion: true,
                reclaimPolicy: "Delete",
                archiveOnDelete: false,
                onDelete: "delete",
                pathPattern: "${.PVC.namespace}-${.PVC.name}",
                accessModes: "ReadWriteOnce",
              },
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
      storageClassName = "nfs-local",
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
