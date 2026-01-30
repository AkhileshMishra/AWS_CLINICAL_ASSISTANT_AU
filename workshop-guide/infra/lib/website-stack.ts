import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class WebsiteStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1. S3 Bucket (Storage)
        // Minimal Cost: Standard Storage, no versioning needed for a guide
        const bucket = new s3.Bucket(this, 'GuideBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For easy cleanup if needed
            autoDeleteObjects: true,
        });

        // 2. CloudFront Distribution (CDN + SSL)
        // Minimal Cost: Free Tier eligible, uses OAC to access S3 securely
        const distribution = new cloudfront.Distribution(this, 'GuideDistribution', {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            defaultRootObject: 'index.html',
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Cheapest: North America / Europe only (but served globally)
        });

        // 3. Outputs for GitHub Action
        new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
        new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
        new cdk.CfnOutput(this, 'GuideURL', { value: `https://${distribution.distributionDomainName}` });
    }
}
