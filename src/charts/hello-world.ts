import { ChartProps } from "cdk8s";
import { Construct } from "constructs";
import { ClusterIssuer } from "@/cert-manager.io";
import {
  IntOrString,
  KubeConfigMap,
  KubeDeployment,
  KubeIngress,
  KubeNamespace,
  KubeService,
} from "@/k8s";
import { Chart, slug } from "~/utils";

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
  clusterIssuer: ClusterIssuer;
}

export class HelloWorldChart extends Chart {
  constructor(
    scope: Construct,
    id: string,
    { url, clusterIssuer, ...props }: HelloWorldChartProps
  ) {
    super(scope, id, props);
    const selector = { app: "hello" };

    new KubeNamespace(this, "namespace", {
      metadata: { name: props.namespace },
    });

    const config = new KubeConfigMap(this, "config", {
      data: { "ngnix.conf": nginxConf },
    });

    new KubeDeployment(this, "deployment", {
      spec: {
        selector: { matchLabels: selector },
        template: {
          metadata: { labels: selector },
          spec: {
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
          },
        },
      },
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

    new KubeIngress(this, "ingress", {
      metadata: {
        annotations: {
          "kubernetes.io/ingress.class": "traefik",
          "cert-manager.io/cluster-issuer": clusterIssuer.name,
        },
      },
      spec: {
        tls: [{ hosts: [url], secretName: slug(url) }],
        rules: [
          {
            host: url,
            http: {
              paths: [
                {
                  pathType: "ImplementationSpecific",
                  path: "/",
                  backend: {
                    service: { name: svc.name, port: { name: "http" } },
                  },
                },
              ],
            },
          },
        ],
      },
    });
  }
}
