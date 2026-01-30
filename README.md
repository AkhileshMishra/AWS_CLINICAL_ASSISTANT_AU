# AWS Clinical AI Assistant - Sydney Edition (Australia)

This application demonstrates the art of the possible for clinical note generation using AWS services available in the **Sydney (ap-southeast-2)** region. It serves as an alternative to AWS HealthScribe for regions where that service is not yet available.

**Key Architecture Changes in this Edition:**
- **Infrastructure**: Replaced Amplify CLI backend with **AWS CDK**.
- **Transcription**: Uses **AWS Transcribe Medical** instead of HealthScribe's built-in transcription.
- **Consultation Summarization**: Uses **Amazon Bedrock (Claude 3.5 Sonnet)** to generate clinical notes from the transcript.
- **Authentication**: Amazon Cognito (provisioned via CDK).
- **Storage**: Amazon S3 (provisioned via CDK).

## Features
- **Record or Upload Audio**: Capture doctor-patient consultations.
- **Real-time Transcription**: (Simulated via Transcribe Medical).
- **AI-Generated Clinical Notes**: Automatic generation of SOAP notes (Subjective, Objective, Assessment, Plan) using Claude 3.5 Sonnet.
- **Sydney Region Support**: Fully deployable in `ap-southeast-2`.

## Deployment

### Prerequisites
- Node.js & NPM
- AWS CLI configured with Administrator credentials.

### 1. Deploy Infrastructure (CDK)
The infrastructure is defined in the `infrastructure/` directory.

```bash
cd infrastructure
npm install
cdk deploy
```
**Important:** Note the outputs from the deployment. You will see values for `VITE_BUCKET_NAME`, `VITE_USER_POOL_ID`, `VITE_USER_POOL_CLIENT_ID`, `VITE_IDENTITY_POOL_ID`, and `VITE_AWS_REGION`.

### 2. Configure Frontend
Create a `.env.local` file in the root directory of the project and populate it with the CDK outputs:

```ini
VITE_AWS_REGION=ap-southeast-2
VITE_BUCKET_NAME=<YOUR_BUCKET_NAME>
VITE_USER_POOL_ID=<YOUR_USER_POOL_ID>
VITE_USER_POOL_CLIENT_ID=<YOUR_USER_POOL_CLIENT_ID>
VITE_IDENTITY_POOL_ID=<YOUR_IDENTITY_POOL_ID>
```

### 3. Run Locally

```bash
npm install
npm run dev
```
Navigate to `http://localhost:5173` to view the application.

## Architecture

1.  **Client**: React application (Cloudscape Design).
2.  **Auth**: Amazon Cognito (User Pool & Identity Pool).
3.  **Storage**: Amazon S3 (Audio files and JSON transcripts/summaries).
4.  **Processing**:
    -   **Transcription**: AWS Transcribe Medical (`StartMedicalTranscriptionJob`).
    -   **Summarization**: Amazon Bedrock (`anthropic.claude-3-5-sonnet-20240620-v1:0`).

## Security
- **Authentication**: Users must sign up/sign in via Cognito.
- **Data Privacy**: Audio and transcripts are stored in your private S3 bucket.
- **IAM Roles**: Least privilege roles are used for Transcribe and Bedrock access.

## License
This library is licensed under the MIT-0 License. See the LICENSE file.
