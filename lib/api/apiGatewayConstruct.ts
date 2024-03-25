import { Construct } from "constructs";
import * as api from "aws-cdk-lib/aws-apigateway";
import { Function } from "aws-cdk-lib/aws-lambda";
import { GetApiKeyCr } from "./getApiKeyCr";
import { CfnOutput } from "aws-cdk-lib";

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
      apiKeySourceType: api.ApiKeySourceType.HEADER,
    });

    const apiKey = new api.ApiKey(this, "reverb-api-key");

    const apiKeyCr = new GetApiKeyCr(this, "reverb-api-key-cr", { apiKey });
    new CfnOutput(this, "apiKey", { value: apiKeyCr.apikeyValue });

    const apiUsagePlan = new api.UsagePlan(this, "usage-plan", {
      name: "reverb-api-usage-plan",
      apiStages: [
        {
          api: this.apigw,
          stage: this.apigw.deploymentStage,
        },
      ],
      throttle: {
        burstLimit: 1000,
        rateLimit: 100,
      },
    });
    apiUsagePlan.addApiKey(apiKey);

    // Set lambda routes
    const eventsResource = this.apigw.root.addResource("events");
    const webhooksResource = this.apigw.root.addResource("webhooks");
    const lambdaIntegration = new api.LambdaIntegration(props.eventsLambda);
    eventsResource.addMethod("POST", lambdaIntegration, {
      apiKeyRequired: true,
    });
    webhooksResource.addMethod("POST", lambdaIntegration);
  }
}
