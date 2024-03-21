import { Construct } from "constructs";
import * as api from "aws-cdk-lib/aws-apigateway";
import { Function } from "aws-cdk-lib/aws-lambda";

interface APIConstructProps {
  readonly eventsLambda: Function;
}

export default class ApiConstruct extends Construct {
  public apigw: api.RestApi;

  constructor(scope: Construct, id: string, props: APIConstructProps) {
    super(scope, id);

    this.apigw = new api.RestApi(this, "reverb-api-gateway", {
      restApiName: "reverb-api-gateway",
      defaultCorsPreflightOptions: {
        allowOrigins: api.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST"],
      },
    });

    const apiDeployment = new api.Deployment(this, "ApiDeployment", {
      api: this.apigw,
    });

    const apiStage = new api.Stage(this, "ApiStage", {
      deployment: apiDeployment,
      stageName: "reverb-prod-stage",
    });

    const apiKey = new api.ApiKey(this, "reverb-api-key", {
      enabled: true,
    });

    const apiUsagePlan = new api.UsagePlan(this, "usage-plan", {
      name: "reverb-api-usage-plan",
      throttle: {
        burstLimit: 1000,
        rateLimit: 100,
      },
    });
    apiUsagePlan.addApiKey(apiKey);
    apiUsagePlan.addApiStage({
      api: this.apigw,
      stage: apiStage,
    });

    // Set lambda routes
    const eventsResource = this.apigw.root.addResource("events");
    const webhooksResource = this.apigw.root.addResource("webhooks");
    const lambdaIntegration = new api.LambdaIntegration(props.eventsLambda);
    eventsResource.addMethod("POST", lambdaIntegration);
    webhooksResource.addMethod("POST", lambdaIntegration);
  }
}
