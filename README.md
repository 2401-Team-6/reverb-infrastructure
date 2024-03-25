# reverb-infrastructure

This is the CDK project to deploy Reverb to AWS.

## Infrastructure

![Infrastructure Image](images/reverb-infra.png)

## Use

### Environmental Variables

Only one environmental variable is required. Please provide, either in a `.env` file in the root of the repository or as an actual environmental variable `FUNCTIONS_SERVER_IMAGE`. `FUNCTIONS_SERVER_IMAGE` should be the repo string for your functions image. If it is on docker hub it should be your function server's image tag(`USER/APP_NAME`)

### Deployment

Prior to deploying make sure you have already:

- Configured aws cli to your account
- Installed cdk bootstrap
  - `npm install -g aws-cdk`
  - `cdk bootstrap`

Once you have your environmental variable set and have bootstrapped, all you need to do is:

```
npm install
npm run deploy
```
