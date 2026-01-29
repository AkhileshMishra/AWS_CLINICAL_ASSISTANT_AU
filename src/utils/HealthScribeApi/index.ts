// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {
    DeleteMedicalTranscriptionJobCommand,
    GetMedicalTranscriptionJobCommand,
    ListMedicalTranscriptionJobsCommand,
    StartMedicalTranscriptionJobCommand,
    StartMedicalTranscriptionJobRequest,
    TranscribeClient,
} from '@aws-sdk/client-transcribe';
import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';

import { getConfigRegion, getCredentials, printTiming } from '@/utils/Sdk';

const OUTPUT_BUCKET = import.meta.env.VITE_BUCKET_NAME;
const BEDROCK_MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

async function getTranscribeClient() {
    return new TranscribeClient({
        region: getConfigRegion(),
        credentials: await getCredentials(),
    });
}

async function getBedrockClient() {
    return new BedrockRuntimeClient({
        region: getConfigRegion(),
        credentials: await getCredentials(),
    });
}

async function getS3Client() {
    return new S3Client({
        region: getConfigRegion(),
        credentials: await getCredentials(),
    });
}

// Compatibility Types for Transcribe Medical replacement
export interface StartMedicalScribeJobRequest {
    MedicalScribeJobName: string;
    DataAccessRoleArn: string;
    OutputBucketName: string;
    Media: { MediaFileUri: string };
    Settings?: any;
    ChannelDefinitions?: any[];
}


export type ListHealthScribeJobsProps = {
    JobNameContains?: string;
    MaxResults?: number;
    NextToken?: string;
    Status?: 'ALL' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
};

export async function listHealthScribeJobs({
    JobNameContains,
    MaxResults = 100,
    NextToken,
    Status,
}: ListHealthScribeJobsProps) {
    const start = performance.now();
    const transcribeClient = await getTranscribeClient();
    const input: any = {
        MaxResults,
        NextToken,
    };
    if (JobNameContains) input.JobNameContains = JobNameContains;
    if (Status && Status !== 'ALL') input.Status = Status;

    const cmd = new ListMedicalTranscriptionJobsCommand(input);
    const response = await transcribeClient.send(cmd);

    const end = performance.now();
    printTiming(end - start, 'ListMedicalTranscriptionJobsCommand');

    return {
        MedicalScribeJobSummaries: response.MedicalTranscriptionJobSummaries?.map(job => ({
            MedicalScribeJobName: job.MedicalTranscriptionJobName,
            CreationTime: job.CreationTime,
            StartTime: job.StartTime,
            CompletionTime: job.CompletionTime,
            MedicalScribeJobStatus: job.TranscriptionJobStatus,
            LanguageCode: job.LanguageCode,
        })) || [],
        NextToken: response.NextToken
    };
}

export type GetHealthScribeJobProps = {
    MedicalScribeJobName: string;
};

export async function getHealthScribeJob({ MedicalScribeJobName }: GetHealthScribeJobProps) {
    const start = performance.now();
    const transcribeClient = await getTranscribeClient();

    // 1. Get Transcription Job
    const cmd = new GetMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: MedicalScribeJobName,
    });

    let job;
    try {
        const response = await transcribeClient.send(cmd);
        job = response.MedicalTranscriptionJob;
    } catch (error) {
        console.error("Error fetching job", error);
        throw error;
    }

    if (!job) throw new Error("Job not found");

    let clinicalDocUri = null;
    let transcriptUri = null;

    if (job.TranscriptionJobStatus === 'COMPLETED') {
        const s3Client = await getS3Client();
        const summaryKey = `medical-output/${MedicalScribeJobName}-summary.json`;
        const transcriptKey = `medical-output/${MedicalScribeJobName}.json`;

        transcriptUri = `s3://${OUTPUT_BUCKET}/${transcriptKey}`;

        // Check if summary exists
        try {
            await s3Client.send(new HeadObjectCommand({ Bucket: OUTPUT_BUCKET, Key: summaryKey }));
            clinicalDocUri = `s3://${OUTPUT_BUCKET}/${summaryKey}`;
        } catch (e: any) {
            // Summary doesn't exist. Generate it.
            if (e.name === 'NotFound') {
                console.log("Generating summary for", MedicalScribeJobName);
                await generatesummary(MedicalScribeJobName, transcriptKey, summaryKey);
                clinicalDocUri = `s3://${OUTPUT_BUCKET}/${summaryKey}`;
            }
        }
    }

    const end = performance.now();
    printTiming(end - start, 'GetMedicalScribeJob (Simulated)');

    return {
        MedicalScribeJob: {
            MedicalScribeJobName: job.MedicalTranscriptionJobName,
            MedicalScribeJobStatus: job.TranscriptionJobStatus,
            MedicalScribeOutput: {
                TranscriptFileUri: transcriptUri,
                ClinicalDocumentUri: clinicalDocUri,
            }
        }
    };
}

async function generatesummary(jobName: string, transcriptKey: string, summaryKey: string) {
    const s3Client = await getS3Client();
    const bedrockClient = await getBedrockClient();

    // 1. Get Transcript JSON
    const getObj = await s3Client.send(new GetObjectCommand({ Bucket: OUTPUT_BUCKET, Key: transcriptKey }));
    const transcriptStr = await getObj.Body?.transformToString();
    if (!transcriptStr) throw new Error("Empty transcript");

    const transcriptJson = JSON.parse(transcriptStr);

    // Extract text from Transcribe Medical Output
    // Structure: results.transcripts[0].transcript
    const fullText = transcriptJson.results?.transcripts?.[0]?.transcript || "";

    // 2. Call Bedrock
    const prompt = `You are a medical scribe. Analyze the following doctor-patient consultation transcript and generate a structured clinical note in the following JSON format.
    
    Transcript:
    ${fullText}
    
    Required JSON Format:
    {
       "ClinicalDocumentation": {
          "Sections": [
             {
                "SectionName": "Subjective",
                "Summary": [ { "SummarizedSegment": "..." } ]
             },
             {
                "SectionName": "Objective",
                "Summary": [ { "SummarizedSegment": "..." } ]
             },
             {
                "SectionName": "Assessment",
                "Summary": [ { "SummarizedSegment": "..." } ]
             },
             {
                "SectionName": "Plan",
                "Summary": [ { "SummarizedSegment": "..." } ]
             }
          ]
       }
    }
    
    Return ONLY valid JSON. Do not include markdown formatting.`;

    const response = await bedrockClient.send(new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 2000,
            messages: [
                { role: "user", content: prompt }
            ]
        })
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const generatedText = responseBody.content?.[0]?.text || "{}";

    // Clean up if markdown blocks are present
    const jsonStr = generatedText.replace(/```json\n|\n```/g, '');

    // 3. Save Summary to S3
    await s3Client.send(new PutObjectCommand({
        Bucket: OUTPUT_BUCKET,
        Key: summaryKey,
        Body: jsonStr,
        ContentType: 'application/json'
    }));
}

export type DeleteHealthScribeJobProps = {
    MedicalScribeJobName: string;
};

export async function deleteHealthScribeJob({ MedicalScribeJobName }: DeleteHealthScribeJobProps) {
    const client = await getTranscribeClient();
    return await client.send(new DeleteMedicalTranscriptionJobCommand({ MedicalTranscriptionJobName: MedicalScribeJobName }));
}

export async function startMedicalScribeJob(params: StartMedicalScribeJobRequest) {
    const client = await getTranscribeClient();
    const jobName = params.MedicalScribeJobName!; // Start request has it optional in types but practically required

    const cmd = new StartMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: jobName,
        Media: params.Media,
        OutputBucketName: OUTPUT_BUCKET,
        OutputKey: `medical-output/${jobName}.json`,
        LanguageCode: 'en-US',
        Specialty: 'PRIMARYCARE',
        Type: 'CONVERSATION',
        Settings: {
            ShowSpeakerLabels: true,
            MaxSpeakerLabels: 2
        }
    });

    const response = await client.send(cmd);

    // Return compatible structure
    return {
        MedicalScribeJob: {
            MedicalScribeJobName: response.MedicalTranscriptionJob?.MedicalTranscriptionJobName || jobName,
            MedicalScribeJobStatus: response.MedicalTranscriptionJob?.TranscriptionJobStatus,
            StartTime: response.MedicalTranscriptionJob?.StartTime,
            // Add other fields if needed by UI
        },
        ...response
    };
}

export { listHealthScribeJobs as listMedicalScribeJobs }; // Export alias if needed
