import * as cdk from 'aws-cdk-lib';
import * as lex from 'aws-cdk-lib/aws-lex';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Construct } from 'constructs';

export class BrainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Python Lambda Hook for Lex Fulfillment using the Alpha construct
    const groqLambda = new PythonFunction(this, 'GroqFulfillmentLambda', {
      entry: 'src/lambda', // Automatically bundles requirements.txt located here
      runtime: lambda.Runtime.PYTHON_3_12,
      index: 'index.py',
      handler: 'lambda_handler', // Matches def lambda_handler in Python
      timeout: cdk.Duration.seconds(30),
      environment: {
        // In a production environment, fetch this from AWS Secrets Manager
        YOUR_GROQ_API_KEY: '',
      },
    });

    // Allow Lex to invoke this Lambda function
    groqLambda.addPermission('AllowLexInvocation', {
      principal: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      action: 'lambda:InvokeFunction',
    });

    // 2. IAM Role for the Lex V2 Bot
    const lexRole = new iam.Role(this, 'LexBotRole', {
      assumedBy: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      inlinePolicies: {
        'LexPollyAccess': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['polly:SynthesizeSpeech'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // 3. The Lex V2 Bot containing exactly one intent (FallbackIntent)
    const askEmBot = new lex.CfnBot(this, 'AskEmBot', {
      name: 'AskEmBrain',
      roleArn: lexRole.roleArn,
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      botLocales: [
        {
          localeId: 'en_US',
          nluConfidenceThreshold: 0.40,
          intents: [
            {
              name: 'FallbackIntent',
              parentIntentSignature: 'AMAZON.FallbackIntent',
              fulfillmentCodeHook: {
                enabled: true,
              },
            },
          ],
        },
      ],
    });

    // 4. Create an immutable Bot Version (required for reliable Alias mapping)
    const botVersion = new lex.CfnBotVersion(this, 'AskEmBotVersion', {
      botId: askEmBot.ref,
      botVersionLocaleSpecification: [
        {
          localeId: 'en_US',
          botVersionLocaleDetails: {
            sourceBotVersion: 'DRAFT',
          },
        },
      ],
    });

    // 5. The Bot Alias (Connect requires this to map the bot & invoke the Lambda hook)
    const botAlias = new lex.CfnBotAlias(this, 'AskEmBotAlias', {
      botId: askEmBot.ref,
      botAliasName: 'Live',
      botVersion: botVersion.attrBotVersion,
      botAliasLocaleSettings: [
        {
          localeId: 'en_US',
          botAliasLocaleSetting: {
            enabled: true,
            codeHookSpecification: {
              lambdaCodeHook: {
                codeHookInterfaceVersion: '1.0',
                lambdaArn: groqLambda.functionArn, // Updated to reference groqLambda
              },
            },
          },
        },
      ],
    });
  }
}
