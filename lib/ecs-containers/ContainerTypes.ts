import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { INamespace } from 'aws-cdk-lib/aws-servicediscovery';

export interface ContainerProps {
  vpc: Vpc;
  cluster: Cluster;
  servicesSecurityGroup: SecurityGroup;
  namespace: INamespace;
}
