
import {
    TranscribeClient,
    StartMedicalTranscriptionJobCommand,
    ListMedicalTranscriptionJobsCommand,
    GetMedicalTranscriptionJobCommand,
    DeleteMedicalTranscriptionJobCommand
} from "@aws-sdk/client-transcribe";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getAmplifyCredentials } from '../Sdk';

// Types
export interface ListHealthScribeJobsProps {
    JobNameContains?: string;
    MaxResults?: number;
    NextToken?: string;
    Status?: string;
}

export interface GetHealthScribeJobProps {
    MedicalScribeJobName: string;
}

export interface DeleteHealthScribeJobProps {
    MedicalScribeJobName: string;
}

export interface StartMedicalScribeJobRequest {
    MedicalScribeJobName: string;
    Media: { MediaFileUri: string };
    OutputBucketName: string;
    DataAccessRoleArn?: string;
    Settings?: any;
    ChannelDefinitions?: any[];
}

// 1. Initialize Clients for Sydney (ap-southeast-2)
const getClients = async () => {
    const creds = await getAmplifyCredentials();
    const config = { region: "ap-southeast-2", credentials: creds };
    return {
        transcribe: new TranscribeClient(config),
        bedrock: new BedrockRuntimeClient(config)
    };
};

// 2. Start Transcription
export const startJob = async (jobName: string, s3Uri: string) => {
    const { transcribe } = await getClients();
    const command = new StartMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: jobName,
        LanguageCode: "en-US",
        Media: { MediaFileUri: s3Uri },
        OutputBucketName: import.meta.env.VITE_BUCKET_NAME,
        OutputKey: `transcripts/${jobName}.json`,
        Specialty: "PRIMARYCARE",
        Type: "CONVERSATION",
        Settings: {
            ShowSpeakerLabels: true,
            MaxSpeakerLabels: 2
        },
        Tags: [
            { Key: "Solution", Value: "AWS_CLINICAL_ASSISTANT_AU" },
            { Key: "Environment", Value: "Workshop" }
        ]
    });
    return await transcribe.send(command).catch(e => {
        console.error("StartJob Error", e);
        return e;
    });
};

// Compatibility wrapper for old NewConversation usage if needed, 
// though we updated NewConversation to use startJob.
export const startMedicalScribeJob = async (props: StartMedicalScribeJobRequest) => {
    return startJob(props.MedicalScribeJobName, props.Media.MediaFileUri);
};

// 3. Generate Clinical Note with Bedrock
export const generateClinicalNote = async (transcriptText: string) => {
    const { bedrock } = await getClients();

    const prompt = `Human: You are an expert medical scribe. 
    Summarize the following doctor-patient transcript into a structured SOAP note.
    
    Transcript:
    ${transcriptText}
    
    Output Instructions:
    Return ONLY a valid JSON object. Do not add markdown formatting.
    The JSON must use exactly these keys: "Subjective", "Objective", "Assessment", "Plan".
    
    Assistant:`;

    const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }]
        })
    });

    try {
        const response = await bedrock.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        let textContent = responseBody.content[0].text;
        
        console.log("Raw Bedrock response:", textContent);
        
        // Strip markdown code blocks if present
        textContent = textContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        
        // Find JSON object boundaries
        const start = textContent.indexOf('{');
        const end = textContent.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            textContent = textContent.slice(start, end + 1);
        }
        
        try {
            return JSON.parse(textContent);
        } catch (parseErr) {
            console.error("JSON parse failed, returning raw text as Subjective");
            return { 
                Subjective: textContent,
                Objective: "Unable to parse structured response",
                Assessment: "",
                Plan: ""
            };
        }
    } catch (e) {
        console.error("Bedrock Error:", e);
        return { Error: "Failed to generate summary. Please check logs." };
    }
};

// 4. List Jobs (Compatibility Layer)
export const listHealthScribeJobs = async (props: ListHealthScribeJobsProps) => {
    const { transcribe } = await getClients();

    const input: any = {
        JobNameContains: props.JobNameContains,
        MaxResults: props.MaxResults,
        NextToken: props.NextToken,
    };

    // Filter by status if provided and not 'ALL'
    if (props.Status && props.Status !== 'ALL') {
        input.Status = props.Status;
    }

    const command = new ListMedicalTranscriptionJobsCommand(input);

    try {
        const response = await transcribe.send(command);

        // Map to structure expected by UI
        const summaries = response.MedicalTranscriptionJobSummaries?.map((job: any) => ({
            MedicalScribeJobName: job.MedicalTranscriptionJobName,
            CreationTime: job.CreationTime,
            StartTime: job.StartTime,
            CompletionTime: job.CompletionTime,
            MedicalScribeJobStatus: job.TranscriptionJobStatus,
            LanguageCode: job.LanguageCode
        })) || [];

        return {
            MedicalScribeJobSummaries: summaries,
            NextToken: response.NextToken
        };
    } catch (e) {
        console.error("List Jobs Error", e);
        return { MedicalScribeJobSummaries: [] };
    }
};

// 5. Delete Job
export const deleteHealthScribeJob = async (props: DeleteHealthScribeJobProps) => {
    const { transcribe } = await getClients();
    const command = new DeleteMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: props.MedicalScribeJobName
    });
    return await transcribe.send(command);
};

// 6. Get Job (needed for Debug.tsx)
export const getHealthScribeJob = async (props: GetHealthScribeJobProps) => {
    const { transcribe } = await getClients();
    const command = new GetMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: props.MedicalScribeJobName
    });
    try {
        const response = await transcribe.send(command);
        // Map to MedicalScribeJob structure expected by legacy components
        return {
            MedicalScribeJob: {
                MedicalScribeJobName: response.MedicalTranscriptionJob?.MedicalTranscriptionJobName,
                MedicalScribeJobStatus: response.MedicalTranscriptionJob?.TranscriptionJobStatus,
                StartTime: response.MedicalTranscriptionJob?.StartTime,
                CompletionTime: response.MedicalTranscriptionJob?.CompletionTime,
                // Add fake output URI to satisfy types if needed
                MedicalScribeOutput: {
                    TranscriptFileUri: `s3://${import.meta.env.VITE_BUCKET_NAME}/transcripts/${props.MedicalScribeJobName}.json`,
                    ClinicalDocumentUri: `s3://${import.meta.env.VITE_BUCKET_NAME}/transcripts/${props.MedicalScribeJobName}_summary.json`
                }
            }
        };
    } catch (e) {
        return null;
    }
};
