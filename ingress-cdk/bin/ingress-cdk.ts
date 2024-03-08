#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { IngressCdkStack } from '../lib/ingress-cdk-stack';

const app = new cdk.App();
new IngressCdkStack(app, 'IngressCdkStack');
