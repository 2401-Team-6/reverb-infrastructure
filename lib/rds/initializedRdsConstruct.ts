import { Construct } from 'constructs';
import { RDSConstructProps, RdsConstruct } from './rdsConstruct';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { DbCustomResource } from './dbCustomResource';
import { DatabaseInstance, DatabaseProxy } from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export class InitializedRdsConstruct extends Construct {
  public rds: DatabaseInstance;
  public securityGroup: ec2.SecurityGroup;
  public secret: Secret;
  public proxy: DatabaseProxy;

  constructor(
    scope: Construct,
    id: string,
    { vpc, availabilityZone }: RDSConstructProps
  ) {
    super(scope, id);

    // Database
    const database = new RdsConstruct(this, 'RDS-Stack', {
      vpc,
      availabilityZone,
    });
    this.rds = database.rds;
    this.secret = database.databaseCredentialsSecret;
    this.proxy = database.proxy;

    this.securityGroup = new ec2.SecurityGroup(
      this,
      'ResourceInitializerFnSg',
      {
        securityGroupName: 'ResourceInitializerFnSg',
        vpc,
        allowAllOutbound: true,
      }
    );

    const initializer = new DbCustomResource(this, 'CustomResource', {
      fnLogRetention: RetentionDays.ONE_DAY,
      fnCode: DockerImageCode.fromImageAsset(`${__dirname}/rds-init-fn-code`),
      fnTimeout: cdk.Duration.minutes(5),
      securityGroups: [this.securityGroup],
      config: {
        credsSecretName: this.secret.secretName,
      },
      vpc,
    });

    initializer.customResource.node.addDependency(database);
    database.rds.connections.allowFrom(
      initializer.dbInitializerFn,
      ec2.Port.tcp(5432)
    );
    this.secret.grantRead(initializer.dbInitializerFn);
  }
}
