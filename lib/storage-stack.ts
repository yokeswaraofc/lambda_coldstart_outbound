import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class StorageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the S3 Bucket for Connect recordings and transcripts
    const connectBucket = new s3.Bucket(this, 'ConnectStorageBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    // Grant object-level permissions (PutObject, GetObject)
    connectBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowConnectObjectAccess',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('connect.amazonaws.com')],
        actions: ['s3:PutObject', 's3:GetObject'],
        resources: [connectBucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': cdk.Stack.of(this).account,
          },
        },
      })
    );

    // Grant bucket-level permissions (GetBucketLocation)
    connectBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowConnectBucketAccess',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('connect.amazonaws.com')],
        actions: ['s3:GetBucketLocation'],
        resources: [connectBucket.bucketArn],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': cdk.Stack.of(this).account,
          },
        },
      })
    );
  }
}