import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import { Construct } from "constructs";
import { InitializedRdsConstruct } from "./rds/initializedRdsConstruct";
import { EcsConstruct } from "./ecs-containers/ecsContainer";
import ApiConstruct from "./api/apiGatewayConstruct";
import {
  Function,
  Code,
  Runtime,
  FunctionUrlAuthType,
} from "aws-cdk-lib/aws-lambda";
import * as api from "aws-cdk-lib/aws-apigateway";
import { MongoConstruct } from "./mongo/mongoConstruct";

export class ReverbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "reverb-vcs", { maxAzs: 2 });

    const rdsDatabase = new InitializedRdsConstruct(this, "reverb-postgres", {
      vpc,
    });

    const mongoConstruct = new MongoConstruct(this, "reverb-mongo", { vpc });

    const reverbHandler = new Function(this, "reverb-event-lambda", {
      vpc,
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

    const logsHandler = new Function(this, "reverb-log-lambda", {
      vpc,
      securityGroups: [mongoConstruct.securityGroup],
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda/logs/deploy-bundle"),
      handler: "index.handler",
      environment: {
        MONGO_SERVER_URL:
          mongoConstruct.mongo.instancePrivateIp + ":27017/logs",
        MONGO_SECRET_ARN: mongoConstruct.mongoCredentialsSecret.secretArn,
      },
    });

    mongoConstruct.mongoCredentialsSecret.grantRead(logsHandler);

    const apiGateway = new ApiConstruct(this, "reverb-api-gateway", {
      eventsLambda: reverbHandler,
      logsLambda: logsHandler,
    });

    const ecs = new EcsConstruct(this, "reverb-ecs", {
      vpc,
      rdsSecret: rdsDatabase.secret,
      mongoConstruct,
    });
    ecs.node.addDependency(rdsDatabase);
  }
}
