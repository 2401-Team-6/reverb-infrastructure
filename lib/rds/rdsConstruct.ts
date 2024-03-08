import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export interface RDSConstructProps {
  readonly vpc: ec2.Vpc;
  readonly availabilityZone: string;
}

export class RdsConstruct extends Construct {
  public rds: rds.DatabaseInstance;
  public databaseCredentialsSecret: secretsManager.Secret;
  public securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: RDSConstructProps) {
    super(scope, id);

    if (!props?.vpc) {
      throw new Error('Please provide a reference to the vpc');
    }

    // RDS Security Group
    this.securityGroup = new ec2.SecurityGroup(this, 'rds-ec2-1', {
      vpc: props.vpc,
      description: 'The security group for the rds instance',
    });

    this.securityGroup.connections.allowFrom(
      ec2.Peer.anyIpv4(),
      ec2.Port.allTraffic(),
      'Allow all traffic on all ports'
    );

    // secret to be used as credentials for our database
    this.databaseCredentialsSecret = new secretsManager.Secret(
      this,
      'DB-Credential-Secret',
      {
        secretName: `database-credentials`,
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'postgres',
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password',
        },
      }
    );

    // next, create a new string parameter to be used
    new ssm.StringParameter(this, 'DBCredentialsArn', {
      parameterName: `database-credentials-arn`,
      stringValue: this.databaseCredentialsSecret.secretArn,
    });

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16_1,
    });

    this.rds = new rds.DatabaseInstance(this, 'Postgres-Database', {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      engine,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      availabilityZone: props.availabilityZone,
      securityGroups: [this.securityGroup],
      multiAz: false,
      allocatedStorage: 100,
      maxAllocatedStorage: 128,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(0),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      databaseName: 'function_schema',
      publiclyAccessible: true,
      credentials: rds.Credentials.fromSecret(this.databaseCredentialsSecret),
    });
  }
}
