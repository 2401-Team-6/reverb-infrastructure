import { Construct } from "constructs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { ContainerProps } from "./containerTypes";
import { FUNCTIONS_URI } from "../../utils/processEnvironment";
import { CfnResource } from "aws-cdk-lib";

export class FnContainer extends Construct {
  public taskDef: ecs.FargateTaskDefinition;
  public service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ContainerProps) {
    super(scope, id);

    const fnImage = ecs.ContainerImage.fromRegistry(FUNCTIONS_URI);

    this.taskDef = new ecs.FargateTaskDefinition(this, "fn-service-taskdef", {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    const fnServiceContainer = this.taskDef.addContainer(
      "fn-service-container",
      {
        containerName: "fn-service-container",
        image: fnImage,
        memoryLimitMiB: 1024,
        logging: ecs.LogDriver.awsLogs({ streamPrefix: "fnService" }),
        environment: {
          GRAPHILE_ENDPOINT: "/graphile",
        },
        secrets: {
          DB_SECRET: ecs.Secret.fromSecretsManager(props.rdsSecret),
        },
      }
    );

    fnServiceContainer.addPortMappings({
      name: "functions",
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    this.service = new ecs.FargateService(this, "fn-service", {
      cluster: props.cluster,
      taskDefinition: this.taskDef,
      serviceName: "fn-service",
      securityGroups: [props.servicesSecurityGroup],
      serviceConnectConfiguration: {
        namespace: props.namespace.namespaceName,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: "fn-service-traffic",
        }),
        services: [
          {
            portMappingName: "functions",
            dnsName: "reverb_fn",
            port: 3000,
            discoveryName: "reverb_fn",
          },
        ],
      },
    });

    const scalableTarget = this.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    });

    scalableTarget.scaleOnCpuUtilization("fn-scaling", {
      targetUtilizationPercent: 75,
    });

    this.service.connections.allowFrom(
      props.servicesSecurityGroup,
      ec2.Port.tcp(3000),
      "Allow traffic within security group on 3000"
    );
  }
}
