import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { ContainerProps } from './containerTypes';
import { Peer, Port } from 'aws-cdk-lib/aws-ec2';
import { INGRESS_URI } from '../../utils/processEnvironment';

export class IngressContainer extends Construct {
  constructor(scope: Construct, id: string, props: ContainerProps) {
    super(scope, id);

    const ingressImage = ecs.ContainerImage.fromRegistry(INGRESS_URI);

    const ingressServiceTaskDef = new ecs.FargateTaskDefinition(
      this,
      'iService_TaskDef',
      {
        cpu: 512,
        memoryLimitMiB: 1024,
      }
    );

    const ingressServiceContainer = ingressServiceTaskDef.addContainer(
      'iService_Container',
      {
        containerName: 'iServiceContainer',
        image: ingressImage,
        memoryLimitMiB: 1024,
        logging: ecs.LogDriver.awsLogs({ streamPrefix: 'iService' }),
        environment: {
          GRAPHILE_ENDPOINT: '/graphile',
        },
        secrets: {
          DB_SECRET: ecs.Secret.fromSecretsManager(props.secret),
        },
      }
    );

    ingressServiceContainer.addPortMappings({
      name: 'api',
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    const ingressService = new ecs.FargateService(this, 'iService', {
      assignPublicIp: true,
      cluster: props.cluster,
      taskDefinition: ingressServiceTaskDef,
      serviceName: 'iService',
      securityGroups: [props.servicesSecurityGroup],
    });

    ingressService.connections.allowFromAnyIpv4(
      Port.tcp(3000),
      'allow incoming from 3000'
    );
  }
}
