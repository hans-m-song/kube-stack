import { EnvVar, Volume } from "@/k8s";

export * from "./app";
export * from "./chart";
export * from "./deployment";
export * from "./ingress";
export * from "./namespace";
export * from "./secret";
export * from "./service";

export const envVarSecretRef = (
  secretName: string,
  key: string,
  name = key
): EnvVar => ({
  name,
  valueFrom: { secretKeyRef: { key, name: secretName } },
});

export const volumeHostPath = (
  name: string,
  hostPath: string,
  type = "DirectoryOrCreate"
): Volume => ({ name, hostPath: { path: hostPath, type } });

export const volumePVC = (name: string, claimName: string): Volume => ({
  name,
  persistentVolumeClaim: { claimName },
});
