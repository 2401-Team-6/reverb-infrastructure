import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ContainerProps } from './containerTypes';
import { WORKERS_URI } from '../../utils/processEnvironment';

export class WorkersContainer extends Construct {
  constructor(scope: Construct, id: string, props: ContainerProps) {
    super(scope, id);

    const workersImage = ecs.ContainerImage.fromRegistry(WORKERS_URI);

    const workersServiceTaskDef = new ecs.FargateTaskDefinition(
      this,
      'wService_TaskDef',
      {
        cpu: 512,
        memoryLimitMiB: 1024,
      }
    );

    const workersServiceContainer = workersServiceTaskDef.addContainer(
      'wService_Container',
      {
        containerName: 'wServiceContainer',
        image: workersImage,
        memoryLimitMiB: 1024,
        logging: ecs.LogDriver.awsLogs({ streamPrefix: 'wService' }),
        environment: {
          DATABASE_ENDPOINT: '/function_schema',
          GRAPHILE_ENDPOINT: '/graphile',
          FUNCTION_SERVER_URL: 'http://ingress_fn:3000/calls',
        },
        secrets: {
          DB_SECRET: ecs.Secret.fromSecretsManager(props.secret),
        },
      }
    );

    const workersService = new ecs.FargateService(this, 'wService', {
      cluster: props.cluster,
      taskDefinition: workersServiceTaskDef,
      serviceName: 'wService',
      securityGroups: [props.servicesSecurityGroup],
    });
    workersService.enableServiceConnect();
  }
}
