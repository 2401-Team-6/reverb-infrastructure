import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ContainerProps } from './ContainerTypes';

export class WContainer extends Construct {
  constructor(scope: Construct, id: string, props: ContainerProps) {
    super(scope, id);

    const wRepo = ecr.Repository.fromRepositoryArn(
      this,
      'EcrWRepo',
      'arn:aws:ecr:us-east-1:866973358190:repository/workers'
    );
    const wImage = ecs.ContainerImage.fromEcrRepository(wRepo);

    const wServiceTaskDef = new ecs.FargateTaskDefinition(
      this,
      'wService_TaskDef',
      {
        cpu: 512,
        memoryLimitMiB: 1024,
      }
    );

    const wServiceContainer = wServiceTaskDef.addContainer(
      'wService_Container',
      {
        containerName: 'wServiceContainer',
        image: wImage,
        memoryLimitMiB: 1024,
        logging: ecs.LogDriver.awsLogs({ streamPrefix: 'wService' }),
        environment: {
          DATABASE_CONNECTION_STRING:
            'postgresql://docker:nothing-but-net13@ingress_db:5432/function_schema',
          GRAPHILE_CONNECTION_STRING:
            'postgresql://docker:nothing-but-net13@ingress_db:5432/graphile',
          FUNCTION_SERVER_URL: 'http://ingress_fn:3000/calls',
        },
      }
    );

    const wService = new ecs.FargateService(this, 'wService', {
      cluster: props.cluster,
      taskDefinition: wServiceTaskDef,
      serviceName: 'wService',
      securityGroups: [props.servicesSecurityGroup],
      serviceConnectConfiguration: {
        namespace: props.namespace.namespaceName,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'wService-traffic',
        }),
        services: [],
      },
    });
  }
}
