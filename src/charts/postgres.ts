import { Construct } from "constructs";
import { config } from "~/config";
import {
  Chart,
  ChartProps,
  Deployment,
  envVarSecretRef,
  Ingress,
  Secret,
  Service,
  volumePVC,
} from "~/constructs";
import { NFSProvisionerChart } from "./nfs-provisioner";

export interface PostgresChartProps extends ChartProps {
  url: string;
}

export class PostgresChart extends Chart {
  svc: Service;

  constructor(
    scope: Construct,
    id: string,
    { url, ...props }: PostgresChartProps
  ) {
    super(scope, id, props);
    const nfs = NFSProvisionerChart.of(this);

    const credentials = new Secret(this, "credentials", {
      data: {
        POSTGRES_USER: config.postgres.user,
        POSTGRES_PASSWORD: config.postgres.password,
        POSTGRES_DB: config.postgres.db,
        PGADMIN_DEFAULT_EMAIL: config.postgres.webEmail,
        PGADMIN_DEFAULT_PASSWORD: config.postgres.webPassword,
      },
    });

    const pgdataPVC = nfs.createPVC(this, "pgdata", "1Gi", "persistent");
    const pgadminPVC = nfs.createPVC(this, "pgadmin", "1Gi", "persistent");

    const deployment = new Deployment(this, "postgres", {
      selector: { app: "postgres" },
      containers: [
        {
          name: "postgres",
          image: "postgres:14",
          env: [
            { name: "PGDATA", value: "/postgres/data/pgdata" },
            envVarSecretRef(credentials.name, "POSTGRES_USER"),
            envVarSecretRef(credentials.name, "POSTGRES_PASSWORD"),
            envVarSecretRef(credentials.name, "POSTGRES_DB"),
          ],
          ports: [{ name: "tunnel", containerPort: 5432 }],
          volumeMounts: [{ name: "pgdata", mountPath: "/postgres/data" }],
        },
        {
          name: "pgadmin",
          image: "dpage/pgadmin4:6.14",
          env: [
            envVarSecretRef(credentials.name, "PGADMIN_DEFAULT_EMAIL"),
            envVarSecretRef(credentials.name, "PGADMIN_DEFAULT_PASSWORD"),
          ],
          ports: [{ name: "web", containerPort: 80 }],
          volumeMounts: [{ name: "pgadmin", mountPath: "/var/lib/pgadmin" }],
        },
      ],
      volumes: [
        volumePVC("pgdata", pgdataPVC.name),
        volumePVC("pgadmin", pgadminPVC.name),
      ],
    });

    this.svc = deployment.getService(this);

    new Ingress(this, "ingress", { hostName: url }).addPath({
      path: "/",
      name: this.svc.name,
      port: "web",
    });
  }
}
