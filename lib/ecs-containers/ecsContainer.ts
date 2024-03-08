import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { FnContainer } from './fnContainer';
import { WorkersContainer } from './workerContainer';
import { IngressContainer } from './ingressContainer';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

interface EcsProps {
  vpc: ec2.Vpc;
  secret: Secret;
}

export class EcsConstruct extends Construct {
  public securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, { vpc, secret }: EcsProps) {
    super(scope, id);

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
    this.securityGroup = servicesSecurityGroup;

    const functionContainer = new FnContainer(this, 'FunctionContainer', {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
      secret,
    });

    const workersContainer = new WorkersContainer(this, 'WorkersContainer', {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
      secret,
    });

    const ingressContainer = new IngressContainer(this, 'IngressContainer', {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
      secret,
    });
  }
}
