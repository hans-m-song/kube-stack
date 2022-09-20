import { KubeSecret, KubeSecretProps } from "@/k8s";
import { Construct } from "constructs";

export interface SecretProps extends Omit<KubeSecretProps, "data"> {
  data?: Record<string, unknown>;
}

export class Secret extends KubeSecret {
  constructor(scope: Construct, id: string, props: SecretProps) {
    super(scope, id, {
      ...props,
      data:
        props.data &&
        Object.entries(props.data).reduce(
          (data, [key, value]) => ({ ...data, [key]: Secret.encode(value) }),
          {} as Record<string, string>
        ),
    });
  }

  static encode(input: unknown): string {
    const value = typeof input !== "string" ? JSON.stringify(input) : input;
    return Buffer.from(value).toString("base64");
  }
}
