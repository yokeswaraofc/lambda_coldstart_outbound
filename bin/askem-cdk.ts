#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/storage-stack';
import { BrainStack } from '../lib/brain-stack';

const app = new cdk.App();
new StorageStack(app, 'AskemStorageStack', {});
new BrainStack(app, 'AskemBrainStack', {});
