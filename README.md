# reverb-infrastructure

This is the CDK project to deploy your Reverb workflow engine infrastructure to AWS.

## Infrastructure

![Infrastructure Image](images/reverb-infra2.png)

## Use

### Deployment

Before deploying, make sure you have already:

- Configured the AWS CLI with your AWS account
- Installed the CDK bootstrap
  - `npm install -g aws-cdk`
  - `cdk bootstrap`

Once you have bootstrapped, all you need to do is run:

```
npm install
npm run deploy
```

### Function Server Deployment

The AWS CDK initially deploys an ECS container without any workflow definitions. In order to define event or cron-triggered workflows and deploy them with Reverb's automated CI/CD, follow the instructions in the [Reverb Repository README](https://github.com/reverb-app/reverb).
