import { RemovalPolicy, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";

export class IngressCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "ingress-VPC", {});

    const rdsSecret = new secretsmanager.Secret(this, "pgCredentialsSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "postgres" }),
        generateStringKey: "password",
        excludePunctuation: true,
        excludeCharacters: '/@"',
        includeSpace: false,
        passwordLength: 16,
      },
    });

    const secretPolicy = new iam.PolicyStatement({
      actions: ["secretsmanager:GetSecretValue"],
      resources: [rdsSecret.secretArn],
      effect: iam.Effect.ALLOW,
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, "DatabaseSG", {
      vpc: vpc,
      description: "Allow access to RDS from Lambda",
      allowAllOutbound: true,
    });

    dbSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(5432),
      "Allow PostgreSQL access from within the VPC"
    );

    const postgresDB = new rds.DatabaseInstance(this, "events-rds", {
      vpc: vpc,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      databaseName: "eventsDB",
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      backupRetention: Duration.days(0),
      deleteAutomatedBackups: true,
      credentials: rds.Credentials.fromSecret(rdsSecret),
      securityGroups: [dbSecurityGroup],
      multiAz: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const rdsProxy = new rds.DatabaseProxy(this, "events-rds-proxy", {
      vpc: vpc,
      proxyTarget: rds.ProxyTarget.fromInstance(postgresDB),
      secrets: [rdsSecret],
      securityGroups: [dbSecurityGroup],
      clientPasswordAuthType: rds.ClientPasswordAuthType.POSTGRES_SCRAM_SHA_256,
    });

    const ingressHandler = new Function(this, "EventIngressHandler", {
      vpc: vpc,
      securityGroups: [dbSecurityGroup],
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda/deploy-bundle"),
      handler: "index.handler",
      environment: {
        RDS_PROXY_URL: rdsProxy.endpoint,
        RDS_PORT: postgresDB.instanceEndpoint.port.toString(),
        DB_NAME: "eventsDB",
        RDS_SECRET_ARN: rdsSecret.secretArn,
      },
    });

    ingressHandler.addToRolePolicy(secretPolicy);

    new apigw.LambdaRestApi(this, "Endpoint", {
      handler: ingressHandler,
    });
  }
}
