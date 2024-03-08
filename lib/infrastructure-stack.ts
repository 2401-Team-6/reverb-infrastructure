import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';

import { Construct } from 'constructs';
import { DbContainer } from './ecs-containers/dbContainer';
import { FnContainer } from './ecs-containers/fnContainer';
import { WContainer } from './ecs-containers/wContainer';
import { IContainer } from './ecs-containers/iContainer';
import { RdsConstruct } from './rds/rdsConstruct';
import { DbCustomResource } from './rds/dbCustomResource';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { InitializedRdsConstruct } from './rds/initializedRdsConstruct';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', { maxAzs: 2 });

    const database = new InitializedRdsConstruct(this, 'ingress-postgres', {
      vpc,
      availabilityZone: vpc.availabilityZones[0],
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: 'ingress-services',
      vpc,
    });

    const namespace = cluster.addDefaultCloudMapNamespace({
      name: 'ingress-services',
      vpc,
      useForServiceConnect: true,
    });

    const servicesSecurityGroup = new ec2.SecurityGroup(
      this,
      'servicesSecuirtyGroup',
      { vpc, allowAllOutbound: true }
    );

    const databaseContainer = new DbContainer(this, 'DatabaseContainer', {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
    });

    const functionContainer = new FnContainer(this, 'FunctionContainer', {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
    });

    const workersContainer = new WContainer(this, 'WorkersContainer', {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
    });

    const ingressContainer = new IContainer(this, 'IngressContainer', {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
    });
  }
}
