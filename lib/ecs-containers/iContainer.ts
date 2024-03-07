import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ContainerProps } from './ContainerTypes';
import { Port } from 'aws-cdk-lib/aws-ec2';

export class IContainer extends Construct {
  constructor(scope: Construct, id: string, props: ContainerProps) {
    super(scope, id);

    const iRepo = ecr.Repository.fromRepositoryArn(
      this,
      'EcrIRepo',
      'arn:aws:ecr:us-east-1:866973358190:repository/ingress'
    );
    const iImage = ecs.ContainerImage.fromEcrRepository(iRepo);

    const iServiceTaskDef = new ecs.FargateTaskDefinition(
      this,
      'iService_TaskDef',
      {
        cpu: 512,
        memoryLimitMiB: 1024,
      }
    );

    const iServiceContainer = iServiceTaskDef.addContainer(
      'iService_Container',
      {
        containerName: 'iServiceContainer',
        image: iImage,
        memoryLimitMiB: 1024,
        logging: ecs.LogDriver.awsLogs({ streamPrefix: 'iService' }),
        environment: {
          GRAPHILE_CONNECTION_STRING:
            'postgresql://docker:nothing-but-net13@ingress_db:5432/graphile',
        },
      }
    );

    iServiceContainer.addPortMappings({
      name: 'api',
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    const iService = new ecs.FargateService(this, 'iService', {
      assignPublicIp: true,
      cluster: props.cluster,
      taskDefinition: iServiceTaskDef,
      serviceName: 'iService',
      securityGroups: [props.servicesSecurityGroup],
      serviceConnectConfiguration: {
        namespace: props.namespace.namespaceName,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'iService-traffic',
        }),
        services: [],
      },
    });

    iService.connections.allowFromAnyIpv4(
      Port.tcp(3000),
      'allow incoming from 3000'
    );
  }
}
