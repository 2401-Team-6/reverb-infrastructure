import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ContainerProps } from './ContainerTypes';

export class DbContainer extends Construct {
  constructor(scope: Construct, id: string, props: ContainerProps) {
    super(scope, id);
    const dbRepo = ecr.Repository.fromRepositoryArn(
      this,
      'EcrDbRepo',
      'arn:aws:ecr:us-east-1:866973358190:repository/database'
    );
    const dbImage = ecs.ContainerImage.fromEcrRepository(dbRepo);

    const dbServiceTaskDef = new ecs.FargateTaskDefinition(
      this,
      'dbService_TaskDef',
      {
        cpu: 512,
        memoryLimitMiB: 1024,
      }
    );

    const dbServiceContainer = dbServiceTaskDef.addContainer(
      'dbService_Container',
      {
        containerName: 'dbServiceContainer',
        image: dbImage,
        memoryLimitMiB: 1024,
        logging: ecs.LogDriver.awsLogs({ streamPrefix: 'dbService' }),
        environment: {
          POSTGRES_PASSWORD: 'nothing-but-net13',
        },
      }
    );

    dbServiceContainer.addPortMappings({
      name: 'postgres',
      containerPort: 5432,
      protocol: ecs.Protocol.TCP,
    });

    const dbService = new ecs.FargateService(this, 'dbService', {
      cluster: props.cluster,
      taskDefinition: dbServiceTaskDef,
      serviceName: 'dbService',
      securityGroups: [props.servicesSecurityGroup],
      serviceConnectConfiguration: {
        namespace: props.namespace.namespaceName,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'dbService-traffic',
        }),
        services: [
          {
            portMappingName: 'postgres',
            dnsName: 'ingress_db',
            port: 5432,
            discoveryName: 'ingress_db',
          },
        ],
      },
    });

    dbService.connections.allowFrom(
      props.servicesSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow traffic within security group on 5432'
    );
  }
}
