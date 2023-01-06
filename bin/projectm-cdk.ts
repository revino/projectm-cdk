#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfraCicdStack } from '../lib/stacks/InfraCicdStack';
import { MainStack } from '../lib/stacks/MainStack';
import envKor from '../config/envKor';

const app = new cdk.App();

new InfraCicdStack(app, 'InfraCicd', { env: envKor });
//new MainStack(app, 'chan', { env: envKor, stackName: 'PrjoectM' });