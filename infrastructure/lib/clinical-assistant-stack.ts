import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class ClinicalAssistantStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1. S3 Bucket for audio files and transcripts
        const bucket = new s3.Bucket(this, 'ClinicalAssistantBucket', {
            bucketName: `clinical-assistant-${this.account}-${this.region}`,
            cors: [{
                allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE, s3.HttpMethods.HEAD],
                allowedOrigins: ['*'],
                allowedHeaders: ['*'],
                exposedHeaders: ['ETag']
            }],
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true
        });

        // 2. Cognito User Pool
        const userPool = new cognito.UserPool(this, 'ClinicalAssistantUserPool', {
            userPoolName: 'clinical-assistant-users',
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            autoVerify: { email: true },
            standardAttributes: {
                email: { required: true, mutable: true }
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        // 3. Cognito User Pool Client
        const userPoolClient = new cognito.UserPoolClient(this, 'ClinicalAssistantClient', {
            userPool,
            userPoolClientName: 'clinical-assistant-web',
            authFlows: {
                userPassword: true,
                userSrp: true
            },
            generateSecret: false
        });

        // 4. Cognito Identity Pool
        const identityPool = new cognito.CfnIdentityPool(this, 'ClinicalAssistantIdentityPool', {
            identityPoolName: 'clinical_assistant_identity_pool',
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [{
                clientId: userPoolClient.userPoolClientId,
                providerName: userPool.userPoolProviderName
            }]
        });

        // 5. IAM Role for Authenticated Users
        const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
            assumedBy: new iam.FederatedPrincipal(
                'cognito-identity.amazonaws.com',
                {
                    StringEquals: {
                        'cognito-identity.amazonaws.com:aud': identityPool.ref
                    },
                    'ForAnyValue:StringLike': {
                        'cognito-identity.amazonaws.com:amr': 'authenticated'
                    }
                },
                'sts:AssumeRoleWithWebIdentity'
            ),
            description: 'Role for authenticated Clinical Assistant users'
        });

        // S3 permissions
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket'
            ],
            resources: [
                bucket.bucketArn,
                `${bucket.bucketArn}/*`
            ]
        }));

        // Transcribe Medical permissions
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'transcribe:StartMedicalTranscriptionJob',
                'transcribe:GetMedicalTranscriptionJob',
                'transcribe:ListMedicalTranscriptionJobs',
                'transcribe:DeleteMedicalTranscriptionJob',
                'transcribe:TagResource'
            ],
            resources: ['*']
        }));

        // Bedrock permissions (Claude models)
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream'
            ],
            resources: [
                `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
                `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0`
            ]
        }));

        // Comprehend Medical permissions
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'comprehendmedical:DetectEntitiesV2',
                'comprehendmedical:InferICD10CM',
                'comprehendmedical:InferRxNorm',
                'comprehendmedical:InferSNOMEDCT'
            ],
            resources: ['*']
        }));

        // Polly permissions (for audio generation feature)
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'polly:SynthesizeSpeech'
            ],
            resources: ['*']
        }));

        // 6. Attach role to Identity Pool
        new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
            identityPoolId: identityPool.ref,
            roles: {
                authenticated: authenticatedRole.roleArn
            }
        });

        // 7. Outputs for .env.local file
        new cdk.CfnOutput(this, 'BucketName', {
            value: bucket.bucketName,
            description: 'S3 Bucket Name - Use as VITE_BUCKET_NAME'
        });

        new cdk.CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID - Use as VITE_USER_POOL_ID'
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID - Use as VITE_USER_POOL_CLIENT_ID'
        });

        new cdk.CfnOutput(this, 'IdentityPoolId', {
            value: identityPool.ref,
            description: 'Cognito Identity Pool ID - Use as VITE_IDENTITY_POOL_ID'
        });

        new cdk.CfnOutput(this, 'Region', {
            value: this.region,
            description: 'AWS Region - Use as VITE_AWS_REGION'
        });
    }
}
