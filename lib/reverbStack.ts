import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import { Construct } from "constructs";
import { InitializedRdsConstruct } from "./rds/initializedRdsConstruct";
import { EcsConstruct } from "./ecs-containers/ecsContainer";
import {
  Function,
  Code,
  Runtime,
  FunctionUrlAuthType,
} from "aws-cdk-lib/aws-lambda";
import { MongoConstruct } from "./mongo/mongoConstruct";

export class ReverbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "reverb-vcs", { maxAzs: 2 });

    const rdsDatabase = new InitializedRdsConstruct(this, "reverb-postgres", {
      vpc,
    });

    const reverbHandler = new Function(this, "reverb-event-lambda", {
      vpc: vpc,
      securityGroups: [rdsDatabase.securityGroup],
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda/events/deploy-bundle"),
      handler: "index.handler",
      environment: {
        RDS_PROXY_URL: rdsDatabase.proxy.endpoint,
        RDS_PORT: rdsDatabase.rds.instanceEndpoint.port.toString(),
        DB_NAME: "graphile",
        RDS_SECRET_ARN: rdsDatabase.secret.secretArn,
      },
    });

    rdsDatabase.secret.grantRead(reverbHandler);
    const lambdaUrl = reverbHandler.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, "reverb-event-lambda-url", {
      value: lambdaUrl.url,
    });

    const mongoConstruct = new MongoConstruct(this, "reverb-mongo", { vpc });

    const ecs = new EcsConstruct(this, "reverb-ecs", {
      vpc,
      rdsSecret: rdsDatabase.secret,
      mongoConstruct,
    });
    ecs.node.addDependency(rdsDatabase);
  }
}
