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

export const startMedicalScribeJob = async (props: StartMedicalScribeJobRequest) => {
    return startJob(props.MedicalScribeJobName, props.Media.MediaFileUri);
};

// 3. Generate Clinical Note with Bedrock
export const generateClinicalNote = async (transcriptText: string) => {
    const { bedrock } = await getClients();
    
    const chunkSize = 10000;
    const chunks: string[] = [];
    
    // Split transcript into chunks
    for (let i = 0; i < transcriptText.length; i += chunkSize) {
        chunks.push(transcriptText.slice(i, i + chunkSize));
    }
    
    // Process each chunk
    const chunkResults: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        const prompt = `You are a medical scribe. Extract clinical information from this transcript segment (part ${i + 1} of ${chunks.length}).

<transcript>
${chunks[i]}
</transcript>

Return ONLY valid JSON with these keys:
{"Subjective":"symptoms, history, complaints, concerns","Objective":"exam findings, vitals, observations","Assessment":"diagnoses, conditions","Plan":"treatments, medications, follow-up"}

Include ALL medication names mentioned. If a section has no info, use empty string.`;

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 4000,
                messages: [{ role: "user", content: prompt }]
            })
        });

        try {
            const response = await bedrock.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            let text = responseBody.content[0].text;
            text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end > start) {
                text = text.slice(start, end + 1);
            }
            chunkResults.push(JSON.parse(text));
        } catch (e) {
            console.error(`Chunk ${i + 1} error:`, e);
        }
    }
    
    // Merge all chunk results
    if (chunkResults.length === 0) {
        return { Subjective: "Error processing transcript", Objective: "", Assessment: "", Plan: "" };
    }
    
    if (chunkResults.length === 1) {
        return chunkResults[0];
    }
    
    // Merge multiple chunks
    const merged = {
        Subjective: chunkResults.map(r => r.Subjective).filter(Boolean).join("\n"),
        Objective: chunkResults.map(r => r.Objective).filter(Boolean).join("\n"),
        Assessment: chunkResults.map(r => r.Assessment).filter(Boolean).join("\n"),
        Plan: chunkResults.map(r => r.Plan).filter(Boolean).join("\n")
    };
    
    return merged;
};

// 4. List Jobs
export const listHealthScribeJobs = async (props: ListHealthScribeJobsProps) => {
    const { transcribe } = await getClients();

    const input: any = {
        JobNameContains: props.JobNameContains,
        MaxResults: props.MaxResults,
        NextToken: props.NextToken,
    };

    if (props.Status && props.Status !== 'ALL') {
        input.Status = props.Status;
    }

    const command = new ListMedicalTranscriptionJobsCommand(input);

    try {
        const response = await transcribe.send(command);
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

// 6. Get Job
export const getHealthScribeJob = async (props: GetHealthScribeJobProps) => {
    const { transcribe } = await getClients();
    const command = new GetMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: props.MedicalScribeJobName
    });
    try {
        const response = await transcribe.send(command);
        return {
            MedicalScribeJob: {
                MedicalScribeJobName: response.MedicalTranscriptionJob?.MedicalTranscriptionJobName,
                MedicalScribeJobStatus: response.MedicalTranscriptionJob?.TranscriptionJobStatus,
                StartTime: response.MedicalTranscriptionJob?.StartTime,
                CompletionTime: response.MedicalTranscriptionJob?.CompletionTime,
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
