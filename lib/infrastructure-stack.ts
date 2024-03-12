import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { Construct } from 'constructs';
import { InitializedRdsConstruct } from './rds/initializedRdsConstruct';
import { EcsConstruct } from './ecs-containers/ecsContainer';
import {
  Function,
  Code,
  Runtime,
  FunctionUrlAuthType,
} from 'aws-cdk-lib/aws-lambda';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', { maxAzs: 2 });

    const database = new InitializedRdsConstruct(this, 'ingress-postgres', {
      vpc,
      availabilityZone: vpc.availabilityZones[0],
    });

    const ingressHandler = new Function(this, 'EventIngressHandler', {
      vpc: vpc,
      securityGroups: [database.securityGroup],
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset('lambda/deploy-bundle'),
      handler: 'index.handler',
      environment: {
        RDS_PROXY_URL: database.proxy.endpoint,
        RDS_PORT: database.rds.instanceEndpoint.port.toString(),
        DB_NAME: 'graphile',
        RDS_SECRET_ARN: database.secret.secretArn,
      },
    });

    database.secret.grantRead(ingressHandler);
    const lambdaUrl = ingressHandler.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, 'Ingress', { value: lambdaUrl.url });

    const ecs = new EcsConstruct(this, 'ingress-ecs', {
      vpc,
      secret: database.secret,
    });
    ecs.node.addDependency(database);
  }
}
