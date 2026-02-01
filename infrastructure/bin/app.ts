#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClinicalAssistantStack } from '../lib/clinical-assistant-stack';

const app = new cdk.App();
new ClinicalAssistantStack(app, 'ClinicalAssistantStack', {
    env: { region: 'ap-southeast-2' },
    description: 'AWS Clinical Assistant - Sydney Workshop Infrastructure'
});
