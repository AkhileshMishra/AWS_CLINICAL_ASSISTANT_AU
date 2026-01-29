import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. S3 Bucket for Audio and Transcripts
    const clinicalBucket = new s3.Bucket(this, 'ClinicalBucket', {
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD, s3.HttpMethods.DELETE],
          allowedOrigins: ['http://localhost:5173', 'http://localhost:3000'], // Add allowed origins
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For workshop/demo purposes
      autoDeleteObjects: true,
    });

    // 2. Cognito User Pool
    const userPool = new cognito.UserPool(this, 'ClinicalUserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireSymbols: false,
        requireUppercase: false,
        requireDigits: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('ClinicalClient', {
      userPoolClientName: 'ClinicalAppClient',
      generateSecret: false,
    });

    // 3. Cognito Identity Pool
    const identityPool = new cognito.CfnIdentityPool(this, 'ClinicalIdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // 4. IAM Roles
    const authenticatedRole = new iam.Role(this, 'ClinicalAuthRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Grant S3 Access
    clinicalBucket.grantReadWrite(authenticatedRole);

    // Grant Transcribe Medical Access
    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'transcribe:StartMedicalTranscriptionJob',
        'transcribe:GetMedicalTranscriptionJob',
        'transcribe:ListMedicalTranscriptionJobs',
        'transcribe:DeleteMedicalTranscriptionJob',
      ],
      resources: ['*'], // In production, scope this down
    }));

    // Grant Bedrock Access
    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
      ],
      resources: ['*'], // Scope to specific models in production
    }));

    // Attach Role to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'VITE_AWS_REGION', { value: this.region });
    new cdk.CfnOutput(this, 'VITE_USER_POOL_ID', { value: userPool.userPoolId });
    new cdk.CfnOutput(this, 'VITE_USER_POOL_CLIENT_ID', { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'VITE_IDENTITY_POOL_ID', { value: identityPool.ref });
    new cdk.CfnOutput(this, 'VITE_BUCKET_NAME', { value: clinicalBucket.bucketName });
  }
}
