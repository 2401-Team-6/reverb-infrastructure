import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface RDSConstructProps {
  readonly vpc: ec2.Vpc;
}

export class RdsConstruct extends Construct {
  public rds: rds.DatabaseInstance;
  public databaseCredentialsSecret: secretsManager.Secret;
  public securityGroup: ec2.SecurityGroup;
  public proxy: rds.DatabaseProxy;

  constructor(scope: Construct, id: string, props: RDSConstructProps) {
    super(scope, id);

    // RDS Security Group
    this.securityGroup = new ec2.SecurityGroup(this, "rds-ec2", {
      vpc: props.vpc,
      description: "The security group for the rds instance",
    });

    this.securityGroup.connections.allowFrom(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      "Allow all traffic on port 5432"
    );

    // secret to be used as credentials for our database
    this.databaseCredentialsSecret = new secretsManager.Secret(
      this,
      "db-credential-secret",
      {
        secretName: `database-credentials`,
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: "reverb",
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: "password",
        },
      }
    );

    // next, create a new string parameter to be used
    new ssm.StringParameter(this, "db-credentials-arn", {
      parameterName: `database-credentials-arn`,
      stringValue: this.databaseCredentialsSecret.secretArn,
    });

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16_1,
    });

    this.rds = new rds.DatabaseInstance(this, "postgres-database", {
      vpc: props.vpc,
      engine,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.SMALL
      ),
      securityGroups: [this.securityGroup],
      multiAz: false,
      allocatedStorage: 100,
      maxAllocatedStorage: 128,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(1),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      databaseName: "graphile",
      credentials: rds.Credentials.fromSecret(this.databaseCredentialsSecret),
    });

    this.proxy = new rds.DatabaseProxy(this, "events-rds-proxy", {
      vpc: props.vpc,
      proxyTarget: rds.ProxyTarget.fromInstance(this.rds),
      secrets: [this.databaseCredentialsSecret],
      securityGroups: [this.securityGroup],
      clientPasswordAuthType: rds.ClientPasswordAuthType.POSTGRES_SCRAM_SHA_256,
    });
  }
}
