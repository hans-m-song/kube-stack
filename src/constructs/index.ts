import { EnvVar, Volume } from "@/k8s";

export * from "./app";
export * from "./chart";
export * from "./deployment";
export * from "./ingress";
export * from "./namespace";
export * from "./secret";
export * from "./service";

export const envVarSecretRef = (
  /**
   * name of secret resource
   */
  secretName: string,
  /**
   * name of key within secret
   */
  secretKey: string,
  /**
   * name of variable, defaults to `secretKey`
   */
  varName = secretKey
): EnvVar => ({
  name: varName,
  valueFrom: { secretKeyRef: { key: secretKey, name: secretName } },
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
