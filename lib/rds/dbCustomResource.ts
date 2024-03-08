import {
  DockerImageCode,
  DockerImageFunction,
  Function,
} from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { CustomResource, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export interface DbCustomResourceProps {
  fnCode: DockerImageCode;
  fnLogRetention: RetentionDays;
  memorySize?: number;
  securityGroups: ISecurityGroup[];
  fnTimeout: Duration;
  config: any;
  vpc: IVpc;
}

export class DbCustomResource extends Construct {
  readonly customResource: CustomResource;
  readonly response: string;
  readonly dbInitializerFn: Function;

  constructor(scope: Construct, id: string, props: DbCustomResourceProps) {
    super(scope, 'DBInitializer');

    this.dbInitializerFn = this.createDbLambdaFunction(props, id);
    this.customResource = this.createProviderCustomResource(props, id);
  }

  private createDbLambdaFunction(
    props: DbCustomResourceProps,
    id: string
  ): Function {
    return new DockerImageFunction(this, 'dbInitializerFunction', {
      memorySize: props.memorySize || 128,
      functionName: `${id}-lambdaFunction`,
      code: props.fnCode,
      vpc: props.vpc,
      securityGroups: props.securityGroups,
      timeout: props.fnTimeout,
      logRetention: props.fnLogRetention,
      // allowAllOutbound: true,
    });
  }

  private createProviderCustomResource(
    props: DbCustomResourceProps,
    id: string
  ): CustomResource {
    const customResourceFnRole = new Role(this, 'AwsCustomResourceRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    const region = Stack.of(this).region;
    const account = Stack.of(this).account;

    customResourceFnRole.addToPolicy(
      new PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [
          `arn:aws:lambda:${region}:${account}:function:${this.dbInitializerFn.functionName}`,
        ],
      })
    );

    const provider = new Provider(this, 'Provider', {
      onEventHandler: this.dbInitializerFn,
      logRetention: props.fnLogRetention,
      vpc: props.vpc,
      securityGroups: props.securityGroups,
    });

    return new CustomResource(this, 'CustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        config: props.config,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      resourceType: 'Custom::DBCustomResource',
    });
  }
}
