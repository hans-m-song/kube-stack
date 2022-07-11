import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { IntOrString, KubeConfigMap, KubeNamespace, KubeService } from "@/k8s";
import { Chart, Deployment, Ingress } from "~/constructs";

const nginxConf = `events {
}

http {
  server {
    listen        80;
    listen        [::]:80;
    server_name   _;
    location / {
      add_header  Content-Type text/plain; # Prevents download
      return      200 "Hello world from k3s!";
    }
  }
}
`;

export interface HelloWorldChartProps extends ChartProps {
  url: string;
  clusterIssuerName?: string;
}

export class HelloWorldChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, clusterIssuerName, ...props }: HelloWorldChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "hello" };

    new KubeNamespace(this, "namespace", {
      metadata: { name: props.namespace },
    });

    const config = new KubeConfigMap(this, "config", {
      data: { "nginx.conf": nginxConf },
    });

    new Deployment(this, "deployment", {
      selector,
      containers: [
        {
          name: "hello-world",
          image: "nginx",
          ports: [{ containerPort: 80, name: "http" }],
          volumeMounts: [
            {
              name: "config",
              mountPath: "/etc/nginx/nginx.conf",
              subPath: "nginx.conf",
            },
          ],
        },
      ],
      volumes: [{ name: "config", configMap: { name: config.name } }],
    });

    const svc = new KubeService(this, "service", {
      spec: {
        selector: selector,
        ports: [
          {
            port: 80,
            targetPort: IntOrString.fromString("http"),
            name: "http",
          },
        ],
      },
    });

    new Ingress(this, "ingress", { hostName: url, clusterIssuerName }).addPath({
      path: "/",
      name: svc.name,
      port: "http",
    });
  }
}
