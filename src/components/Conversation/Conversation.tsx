// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { Suspense, lazy, useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import ContentLayout from '@cloudscape-design/components/content-layout';
import Grid from '@cloudscape-design/components/grid';

import ModalLoader from '@/components/SuspenseLoader/ModalLoader';
import { useAudio } from '@/hooks/useAudio';
import { useNotificationsContext } from '@/store/notifications';
import { getObject } from '@/utils/S3Api';
import { generateClinicalNote } from '@/utils/HealthScribeApi';
import { detectEntitiesFromComprehendMedical } from '@/utils/ComprehendMedicalApi';
import { mapTranscribeToHealthScribe } from '@/utils/DataMapper';

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
                const transcriptKey = `transcripts/${name}.json`;

                console.log("Loading conversation:", name);

                // 1. Fetch Raw Transcript from S3
                const transcriptRsp = await getObject({ Bucket: bucket, Key: transcriptKey });
                const transcriptStr = await transcriptRsp.Body?.transformToString();

                if (!transcriptStr) {
                    throw new Error("Transcript file is empty or not found");
                }
                const rawTranscribeJson = JSON.parse(transcriptStr);
                const rawText = rawTranscribeJson.results?.transcripts?.[0]?.transcript || "";

                // 2. Parallel Fetch: Bedrock Summary & Comprehend Entities
                // We generate these on the fly as per the workshop architecture for Sydney
                const [summaryData, entitiesData] = await Promise.all([
                    generateClinicalNote(rawText),
                    detectEntitiesFromComprehendMedical(rawText)
                ]);

                // 3. Map to HealthScribe Format for UI
                const healthScribeObject = mapTranscribeToHealthScribe(
                    rawTranscribeJson,
                    summaryData,
                    entitiesData
                );

                setSummary(summaryData);
                setTranscript(healthScribeObject);

            } catch (e) {
                console.error("Load Error", e);
                // Handle 404s gracefully-ish (job might be processing)
                if ((e as any).name === 'NoSuchKey') {
                    addFlashMessage({
                        id: 'Job Processing',
                        header: 'Job still processing',
                        content: 'The transcript is not ready yet. Please try again later.',
                        type: 'info',
                    });
                } else {
                    addFlashMessage({
                        id: 'Load Error',
                        header: 'Error loading data',
                        content: e?.toString() || 'Unknown error',
                        type: 'error',
                    });
                }
            } finally {
                setJobLoading(false);
            }
        }

        if (conversationName) {
            loadData(conversationName);
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
