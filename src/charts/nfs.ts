import { KubePersistentVolumeClaim, KubeStorageClass, Quantity } from "@/k8s";
import { Construct } from "constructs";
import { Chart, ChartProps } from "~/constructs";
import { Helm } from "~/constructs/helm";

const NFS_PROVISIONER_CHART_SYMBOL = Symbol.for(
  "@kube-stack/charts.nfs-provisioner"
);

export interface NFSProvisionerChartProps extends ChartProps {
  helmVersion: string;
  nfsServer: string;
  nfsPath: string;
}

export class NFSChart extends Chart {
  static of(construct: Construct): NFSChart {
    return Chart.search(construct, NFS_PROVISIONER_CHART_SYMBOL) as NFSChart;
  }

  ephemeralSC: KubeStorageClass;
  persistentSC: KubeStorageClass;

  constructor(
    scope: Construct,
    id: string,
    { helmVersion, nfsServer, nfsPath, ...props }: NFSProvisionerChartProps
  ) {
    super(scope, id, props);
    Object.defineProperty(this, NFS_PROVISIONER_CHART_SYMBOL, { value: true });

    new Helm(this, "nfs-subdir-external-provisioner", {
      namespace: props.namespace,
      chart: "nfs-subdir-external-provisioner/nfs-subdir-external-provisioner",
      releaseName: "nfs-subdir-external-provisioner",
      version: helmVersion,
      values: {
        nfs: {
          path: nfsPath,
          server: nfsServer,
          reclaimPolicy: "Retain",
        },
        storageClass: {
          create: false,
        },
      },
    });

    this.ephemeralSC = this.createSC("ephemeral", {
      archiveOnDelete: "false",
      onDelete: "delete",
      pathPattern: "${.PVC.namespace}/${.PVC.name}",
    });

    this.persistentSC = this.createSC("persistent", {
      archiveOnDelete: "false",
      onDelete: "retain",
      pathPattern: "${.PVC.namespace}/${.PVC.name}",
    });
  }

  private createSC(id: string, parameters?: Record<string, string>) {
    return new KubeStorageClass(this, id, {
      metadata: {
        annotations: {
          "argocd.argoproj.io/sync-options": "Prune=false",
        },
        labels: {
          "argocd.argoproj.io/instance": "nfs-subdir-external-provisioner",
        },
      },
      provisioner: "cluster.local/nfs-subdir-external-provisioner",
      allowVolumeExpansion: true,
      reclaimPolicy: "Delete",
      volumeBindingMode: "Immediate",
      // mountOptions: ["nfsvers=3"],
      parameters: {
        archiveOnDelete: "false",
        onDelete: "retain",
        pathPattern: "${.PVC.namespace}-${.PVC.name}",
        ...parameters,
      },
    });
  }

  /**
   * Creates a PVC that WILL NOT delete data when removed
   */
  persistentPVC(
    scope: Construct,
    id: string,
    capacity: string,
    props: {
      accessModes?: string[];
      volumeMode?: string;
    } = {}
  ) {
    return this.createPVC(scope, id, capacity, "persistent", props);
  }

  /**
   * Creates a PVC that WILL delete data when removed
   */
  ephemeralPVC(
    scope: Construct,
    id: string,
    capacity: string,
    props: {
      accessModes?: string[];
      volumeMode?: string;
    } = {}
  ) {
    return this.createPVC(scope, id, capacity, "ephemeral", props);
  }

  createPVC(
    scope: Construct,
    id: string,
    capacity: string,
    mode: "persistent" | "ephemeral" = "persistent",
    props: {
      accessModes?: string[];
      volumeMode?: string;
    } = {}
  ) {
    const accessModes = props.accessModes ?? ["ReadWriteOnce"];
    const volumeMode = props.volumeMode ?? "Filesystem";
    const storage = Quantity.fromString(capacity);
    const storageClass =
      mode === "persistent" ? this.persistentSC : this.ephemeralSC;

    return new KubePersistentVolumeClaim(scope, `${id}-pvc`, {
      spec: {
        accessModes,
        storageClassName: storageClass.name,
        volumeMode,
        resources: { requests: { storage } },
      },
    });
  }
}
