# AWS Clinical AI Assistant - Sydney Edition (Australia)

This application demonstrates the art of the possible for clinical note generation using AWS services available in the **Sydney (ap-southeast-2)** region. It serves as an alternative to AWS HealthScribe for regions where that service is not yet available.

**Key Architecture Changes in this Edition:**
- **Infrastructure**: Replaced Amplify CLI backend with **AWS CDK**.
- **Transcription**: Uses **AWS Transcribe Medical** instead of HealthScribe's built-in transcription.
- **Consultation Summarization**: Uses **Amazon Bedrock (Claude 3 Haiku)** to generate clinical notes from the transcript. Claude 3.5 Sonnet can be configured as an alternative.
- **Authentication**: Amazon Cognito (provisioned via CDK).
- **Storage**: Amazon S3 (provisioned via CDK).
- **Medical Entity Extraction**: Uses **Amazon Comprehend Medical** to highlight medical terms.

## Features
- **Three Input Modes**:
  - **Upload Audio**: Upload pre-recorded doctor-patient conversations (.wav, .mp3, .m4a, .flac)
  - **Live Recording**: Record conversations directly from your microphone
  - **Generate Audio**: Create synthetic conversations using Amazon Polly for testing
- **Speaker Diarization**: Automatically identifies Doctor vs Patient using Transcribe Medical
- **AI-Generated Clinical Notes**: Automatic generation of SOAP notes (Subjective, Objective, Assessment, Plan) using Claude 3 Haiku
- **Medical Entity Highlighting**: Comprehend Medical identifies medications, conditions, dosages, etc.
- **Sydney Region Support**: Fully deployable in `ap-southeast-2`

## Deployment

### Prerequisites
- Node.js v18+ & NPM
- AWS CLI v2 configured with Administrator credentials
- AWS CDK (`sudo npm install -g aws-cdk` on macOS/Linux)
- Git

### 1. Enable Bedrock Model Access
Before deploying, enable Claude model access in the AWS Console:
1. Go to Amazon Bedrock in the Sydney region
2. Click "Model access" → "Modify model access"
3. Enable "Claude 3 Haiku" (required) and optionally "Claude 3.5 Sonnet"
4. Submit and wait for "Access granted" status

### 2. Bootstrap CDK (First-time only)
```bash
cdk bootstrap
```

### 3. Deploy Infrastructure (CDK)
```bash
cd infrastructure
npm install
cdk deploy
```

> **Note:** If you get `EACCES: permission denied`, run:
> ```bash
> sudo chown -R $(whoami) ~/.npm
> npm install
> ```

**Important:** Note the outputs from the deployment. You will see values for `BucketName`, `UserPoolId`, `UserPoolClientId`, `IdentityPoolId`, and `Region`.

### 4. Configure Frontend
Create a `.env.local` file in the root directory of the project and populate it with the CDK outputs:

```ini
VITE_AWS_REGION=ap-southeast-2
VITE_BUCKET_NAME=<YOUR_BUCKET_NAME>
VITE_USER_POOL_ID=<YOUR_USER_POOL_ID>
VITE_USER_POOL_CLIENT_ID=<YOUR_USER_POOL_CLIENT_ID>
VITE_IDENTITY_POOL_ID=<YOUR_IDENTITY_POOL_ID>
```

### 5. Run Locally

```bash
npm install --legacy-peer-deps
npm run dev
```

> **Note:** The `--legacy-peer-deps` flag is required because React 19 has peer dependency conflicts with Cloudscape components. The app works correctly despite this warning.

Navigate to `http://localhost:5173` to view the application.

### 6. Create Account & Test
1. Sign up with your email (password requires: 8+ chars, uppercase, lowercase, number, special char)
2. Verify your email with the code sent
3. Sign in and try uploading or recording audio

## Architecture

1.  **Client**: React application (Cloudscape Design).
2.  **Auth**: Amazon Cognito (User Pool & Identity Pool).
3.  **Storage**: Amazon S3 (Audio files and JSON transcripts/summaries).
4.  **Processing**:
    -   **Transcription**: AWS Transcribe Medical (`StartMedicalTranscriptionJob`)
    -   **Summarization**: Amazon Bedrock (`anthropic.claude-3-haiku-20240307-v1:0`)
    -   **Entity Extraction**: Amazon Comprehend Medical (`DetectEntitiesV2`)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ERESOLVE peer dependency` error | Use `npm install --legacy-peer-deps` |
| `EACCES permission denied` | Run `sudo chown -R $(whoami) ~/.npm` |
| CDK install permission error | Use `sudo npm install -g aws-cdk` |
| Password rejected | Must have 8+ chars, uppercase, lowercase, number, special char |
| "Access Denied" errors | Enable Bedrock model access in AWS Console |
| Lost CDK outputs | Run `aws cloudformation describe-stacks --stack-name ClinicalAssistantStack --query "Stacks[0].Outputs" --output table --region ap-southeast-2` |

## Clean Up
```bash
cd infrastructure
cdk destroy
```

## Security
- **Authentication**: Users must sign up/sign in via Cognito.
- **Data Privacy**: Audio and transcripts are stored in your private S3 bucket.
- **IAM Roles**: Least privilege roles are used for Transcribe and Bedrock access.

## Known Limitations
- **Language**: Transcription is hardcoded to `en-US`. Other languages are not currently supported.
- **Speaker Roles**: The first speaker (`spk_0`) is assumed to be the clinician. If the patient speaks first, roles may be swapped in the transcript.

## License
This library is licensed under the MIT-0 License. See the LICENSE file.
