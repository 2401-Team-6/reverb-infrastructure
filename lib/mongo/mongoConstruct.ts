import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { readFileSync } from "fs";

export interface MongoConstructProps {
  readonly vpc: ec2.Vpc;
}

export class MongoConstruct extends Construct {
  public securityGroup: ec2.SecurityGroup;
  public mongoCredentialsSecret: Secret;
  public mongo: ec2.Instance;

  constructor(scope: Construct, id: string, { vpc }: MongoConstructProps) {
    super(scope, id);

    this.securityGroup = new ec2.SecurityGroup(this, "mongo-ec2", {
      vpc: vpc,
      description: "The security group for the mongo instance",
    });

    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(27017),
      "Allow all traffic on port 27017"
    );

    const cfnKeyPair = new ec2.CfnKeyPair(this, "mongo-key-pair", {
      keyName: "MONGO_KEY",
    });

    const role = new iam.Role(this, "mongo-role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    const ssmPolicyDoc = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ssm:UpdateInstanceInformation",
            "ssmmessages:CreateControlChannel",
            "ssmmessages:CreateDataChannel",
            "ssmmessages:OpenControlChannel",
            "ssmmessages:OpenDataChannel",
          ],
          resources: ["*"],
        }),
      ],
    });

    const ssmPolicy = new iam.Policy(this, "ssmPolicy", {
      document: ssmPolicyDoc,
    });

    role.attachInlinePolicy(ssmPolicy);

    this.mongo = new ec2.Instance(this, "mongo-instance", {
      vpc,
      role,
      instanceName: "reverb-logs",
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: new ec2.InstanceType("t3.micro"),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      securityGroup: this.securityGroup,
      keyName: cfnKeyPair.keyName,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(100),
        },
      ],
    });

    this.mongoCredentialsSecret = new Secret(this, "mongo-credentials-secret", {
      secretName: "mongo-credentials",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "reverb" }),
        generateStringKey: "password",
        excludePunctuation: true,
        includeSpace: false,
      },
    });

    this.mongoCredentialsSecret.grantRead(this.mongo);

    const userDataScript = readFileSync("./lib/mongo/setup.sh", "utf8");
    this.mongo.addUserData(userDataScript);
  }
}
