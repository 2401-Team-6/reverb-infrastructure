import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { Construct } from 'constructs';
import { InitializedRdsConstruct } from './rds/initializedRdsConstruct';
import { EcsConstruct } from './ecs-containers/ecsContainer';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', { maxAzs: 2 });

    const database = new InitializedRdsConstruct(this, 'ingress-postgres', {
      vpc,
      availabilityZone: vpc.availabilityZones[0],
    });

    const ecs = new EcsConstruct(this, 'ingress-ecs', {
      vpc,
      secret: database.secret,
    });
    ecs.node.addDependency(database);
  }
}
