import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { FnContainer } from "./fnContainer";
import { WorkersContainer } from "./workerContainer";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { MongoConstruct } from "../mongo/mongoConstruct";

interface EcsProps {
  vpc: ec2.Vpc;
  rdsSecret: Secret;
  mongoConstruct: MongoConstruct;
}

export class EcsConstruct extends Construct {
  public securityGroup: ec2.SecurityGroup;

  constructor(
    scope: Construct,
    id: string,
    { vpc, rdsSecret, mongoConstruct }: EcsProps
  ) {
    super(scope, id);

    const cluster = new ecs.Cluster(this, "reverb-cluster", {
      clusterName: "reverb-services",
      vpc,
    });

    const namespace = cluster.addDefaultCloudMapNamespace({
      name: "reverb-services",
      vpc,
      useForServiceConnect: true,
    });

    const servicesSecurityGroup = new ec2.SecurityGroup(
      this,
      "services-secuirty-group",
      { vpc, allowAllOutbound: true }
    );
    this.securityGroup = servicesSecurityGroup;

    const functionContainer = new FnContainer(this, "functions-container", {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
      rdsSecret,
    });

    const workersContainer = new WorkersContainer(this, "workers-container", {
      namespace,
      cluster,
      vpc,
      servicesSecurityGroup,
      rdsSecret,
      mongoConstruct,
    });

    workersContainer.node.addDependency(functionContainer);
  }
}
