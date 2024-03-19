import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { ContainerProps } from "./containerTypes";
import { WORKERS_URI } from "../../utils/processEnvironment";
import { MongoConstruct } from "../mongo/mongoConstruct";
import { Peer, Port } from "aws-cdk-lib/aws-ec2";

interface WorkersProps extends ContainerProps {
  mongoConstruct: MongoConstruct;
}

export class WorkersContainer extends Construct {
  constructor(scope: Construct, id: string, props: WorkersProps) {
    super(scope, id);

    const workersImage = ecs.ContainerImage.fromRegistry(WORKERS_URI);

    const workersServiceTaskDef = new ecs.FargateTaskDefinition(
      this,
      "worker-server-task-def",
      {
        cpu: 512,
        memoryLimitMiB: 1024,
      }
    );

    const workersServiceContainer = workersServiceTaskDef.addContainer(
      "worker-server-container",
      {
        containerName: "worker-server-container",
        image: workersImage,
        memoryLimitMiB: 1024,
        logging: ecs.LogDriver.awsLogs({ streamPrefix: "workerServer" }),
        environment: {
          GRAPHILE_ENDPOINT: "/graphile",
          FUNCTION_SERVER_URL: "http://reverb_fn:3000/calls",
          MONGO_SERVER_URL:
            props.mongoConstruct.mongo.instancePrivateIp + ":27017/logs",
        },
        secrets: {
          DB_SECRET: ecs.Secret.fromSecretsManager(props.rdsSecret),
          MONGO_SECRET: ecs.Secret.fromSecretsManager(
            props.mongoConstruct.mongoCredentialsSecret
          ),
        },
      }
    );

    const workersService = new ecs.FargateService(this, "workers-service", {
      cluster: props.cluster,
      taskDefinition: workersServiceTaskDef,
      serviceName: "workers-service",
      securityGroups: [props.servicesSecurityGroup],
      serviceConnectConfiguration: {
        namespace: props.namespace.namespaceName,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: "workers-service-traffic",
        }),
        services: [],
      },
    });

    workersService.node.addDependency(props.mongoConstruct);
  }
}
