# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   type-check the project
* `npm run watch`   watch for changes and type-check
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


# AWS Serverless Voice Agent (Amazon Connect + Lambda + Groq)

This repository contains an Infrastructure-as-Code (IaC) AWS CDK deployment for an outbound Voice AI agent. It provisions Amazon Connect, AWS Lambda (Python), and integrates with the Groq API for real-time LLM responses.

**⚠️ Architecture Note (Cold Start Issue):** 
This repository serves as an archived baseline. Because AWS Lambda spins up a fresh execution environment on the first invocation, this architecture experiences "cold start" latency. For real-time WebRTC audio (where sub-second latency is required), migrating to persistent containers (like AWS ECS Fargate with LiveKit) is recommended.

## Prerequisites
Before you begin, ensure you have the following installed:
* [Node.js & npm](https://nodejs.org/) (Required for AWS CDK)
* [AWS CLI](https://aws.amazon.com/cli/) configured with your AWS Account credentials (`aws configure`)
* [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) (`npm install -g aws-cdk`)
* Python 3.9+ (For the Lambda function environment)

## 1. Environment Setup & Secret Management
**CRITICAL:** Never hardcode your Groq API key in `lib/brain-stack.ts`.

1. Create a `.env` file in the root of the project:
   ```bash
   touch .env




Add your Groq API key to the .env file:

Code snippet
GROQ_API_KEY=gsk_your_actual_api_key_here
(Note: Ensure .env is added to your .gitignore file so it is never pushed to GitHub).

2. Install Dependencies
Install the CDK infrastructure dependencies:

Bash
npm install
(If your Lambda function requires specific Python packages, ensure they are installed or packaged in your Lambda asset folder).

3. Deployment
To deploy this architecture to your AWS account, run:

Bash
# 1. Bootstrap your AWS environment (Only needed the very first time you use CDK in an account/region)
cdk bootstrap

# 2. Synthesize the CloudFormation template
cdk synth

# 3. Deploy the stack to AWS
cdk deploy
Type y when prompted to confirm IAM role creations.

4. How to Trigger an Outbound Call
Once deployed, the CDK stack will output your API Gateway endpoint or Lambda ARN.
You can trigger an outbound call by invoking the Lambda function directly via the AWS CLI or passing a payload containing the target phone number:

Bash
aws lambda invoke \
  --function-name <Your-Deployed-Lambda-Name> \
  --payload '{"target_phone": "+1234567890"}' \
  response.json