// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Suspense, lazy, useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import ContentLayout from '@cloudscape-design/components/content-layout';
import Grid from '@cloudscape-design/components/grid';

import ModalLoader from '@/components/SuspenseLoader/ModalLoader';
import { useAudio } from '@/hooks/useAudio';
import { useNotificationsContext } from '@/store/notifications';
import { getObject, getS3Object } from '@/utils/S3Api';
import { generateClinicalNote } from '@/utils/HealthScribeApi';

import { ConversationHeader } from './ConversationHeader';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import TopPanel from './TopPanel';

const ViewOutput = lazy(() => import('./ViewOutput'));

export default function Conversation() {
    const { conversationName } = useParams();
    const { addFlashMessage } = useNotificationsContext();

    const [jobLoading, setJobLoading] = useState(true);
    const [showOutputModal, setShowOutputModal] = useState<boolean>(false);

    // Outputs
    const [transcript, setTranscript] = useState<any>();
    const [summary, setSummary] = useState<any>();

    const [
        wavesurfer,
        audioReady,
        setAudioReady,
        audioTime,
        setAudioTime,
        smallTalkCheck,
        setSmallTalkCheck,
        highlightId,
        setHighlightId,
    ] = useAudio();

    // Fake job details for UI compatibility
    const jobDetails: any = {
        MedicalScribeJobName: conversationName,
        MedicalScribeJobStatus: 'COMPLETED',
        StartTime: new Date(),
        CompletionTime: new Date()
    };

    useEffect(() => {
        async function loadData(name: string) {
            try {
                setJobLoading(true);
                const bucket = import.meta.env.VITE_BUCKET_NAME;

                // 1. Fetch Transcript
                try {
                    const transcriptKey = `transcripts/${name}.json`;
                    const transcriptRsp = await getObject({ Bucket: bucket, Key: transcriptKey });
                    const transcriptStr = await transcriptRsp.Body?.transformToString();
                    if (transcriptStr) {
                        setTranscript(JSON.parse(transcriptStr));
                    }
                } catch (e) {
                    console.warn("Transcript not ready yet");
                }

                // 2. Fetch Summary (or generate if missing)
                // Note: In a real app, we might poll. Here we try to fetch, if 404, we generate.
                // Ideally, the workshop implies Bedrock runs after Transcribe.
                // We will simply try to generate if we have a transcript but no summary?
                // Actually, the previous logic tried to lazy-generate.
                // But wait, the new `HealthScribeApi` ONLY exports `generateClinicalNote(text)`.
                // It does NOT save it to S3 automatically in the user's snippet.
                // The user's snippet just returns the JSON.
                // So we should probably just generate it on the fly and display it?
                // Or we can try to save it too.
                // Let's just generate it on the fly for now to keep it simple and stateless on that part, 
                // or maybe the user implies we should save it? 
                // The prompt says "Generate Clinical Note with Bedrock".
                // Let's fetch transcript, then call Bedrock.

                if (transcript && !summary) {
                    // We need the transcript text.
                    // The transcript JSON structure from Transcribe Medical:
                    // results.transcripts[0].transcript
                    // But wait, I need to fetch the transcript first effectively.
                }

            } catch (e) {
                addFlashMessage({
                    id: 'Load Error',
                    header: 'Error loading data',
                    content: e?.toString() || 'Unknown error',
                    type: 'error',
                });
            }
            setJobLoading(false);
        }

        if (conversationName) {
            // Need to separate the async logic to properly use awaits used above inside the effect?
            // Actually, let's just do a simpler fetch flow.
            const bucket = import.meta.env.VITE_BUCKET_NAME;
            const transcriptKey = `transcripts/${conversationName}.json`;
            const summaryKey = `transcripts/${conversationName}_summary.json`; // Convention?

            setJobLoading(true);

            // Fetch Transcript
            getObject({ Bucket: bucket, Key: transcriptKey })
                .then(async (res) => {
                    const str = await res.Body?.transformToString();
                    if (!str) return;
                    const json = JSON.parse(str);
                    setTranscript(json);
                    return json;
                })
                .then(async (transcriptJson) => {
                    if (!transcriptJson) return;

                    // Try to generate summary using Bedrock
                    // We simply call generateClinicalNote with the text
                    const text = transcriptJson.results?.transcripts?.[0]?.transcript;
                    if (text) {
                        try {
                            const note = await generateClinicalNote(text);
                            setSummary(note);
                        } catch (e) {
                            console.error("Bedrock generation failed", e);
                        }
                    }
                })
                .catch(e => {
                    console.warn("Transcript likely not ready", e);
                })
                .finally(() => setJobLoading(false));
        }
    }, [conversationName]);

    return (
        <ContentLayout
            headerVariant={'high-contrast'}
            header={<ConversationHeader jobDetails={jobDetails} setShowOutputModal={setShowOutputModal} />}
        >
            {showOutputModal && (
                <Suspense fallback={<ModalLoader />}>
                    <ViewOutput
                        setVisible={setShowOutputModal}
                        transcriptString={JSON.stringify(transcript || 'Loading...', null, 2)}
                        clinicalDocumentString={JSON.stringify(summary || 'Loading...', null, 2)}
                    />
                </Suspense>
            )}
            <Grid
                gridDefinition={[
                    { colspan: { default: 12 } },
                    { colspan: { default: 6 } },
                    { colspan: { default: 6 } },
                ]}
            >
                <TopPanel
                    jobLoading={jobLoading}
                    jobDetails={jobDetails}
                    transcript={transcript}
                    wavesurfer={wavesurfer}
                    smallTalkCheck={smallTalkCheck}
                    setSmallTalkCheck={setSmallTalkCheck}
                    setAudioTime={setAudioTime}
                    setAudioReady={setAudioReady}
                />
                <LeftPanel
                    jobLoading={jobLoading}
                    transcript={transcript}
                    highlightId={highlightId}
                    setHighlightId={setHighlightId}
                    wavesurfer={wavesurfer}
                    smallTalkCheck={smallTalkCheck}
                    audioTime={audioTime}
                    setAudioTime={setAudioTime}
                    audioReady={audioReady}
                />
                <RightPanel
                    loading={jobLoading}
                    summary={summary}
                />
            </Grid>
        </ContentLayout>
    );
}
