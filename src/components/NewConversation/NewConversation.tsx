// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import Button from '@cloudscape-design/components/button';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import Form from '@cloudscape-design/components/form';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import RadioGroup from '@cloudscape-design/components/radio-group';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Spinner from '@cloudscape-design/components/spinner';
import TokenGroup from '@cloudscape-design/components/token-group';

import { Progress } from '@aws-sdk/lib-storage';
import dayjs from 'dayjs';

import { useS3 } from '@/hooks/useS3';
import { useNotificationsContext } from '@/store/notifications';
import { startJob } from '@/utils/HealthScribeApi';
import { fileUpload } from '@/utils/S3Api';
import sleep from '@/utils/sleep';


import AudioRecorder from './AudioRecorder';
import { AudioDropzone } from './Dropzone';
import { AudioDetailSettings, AudioIdentificationType, InputName, NoteType } from './FormComponents';
import styles from './NewConversation.module.css';
import { AudioDetails, AudioSelection } from './types';

export default function NewConversation() {
    const { updateProgressBar } = useNotificationsContext();
    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formError, setFormError] = useState<string | React.ReactElement[]>('');
    const [jobName, setJobName] = useState<string>('');
    const [noteType, setNoteType] = useState<any>('HISTORY_AND_PHYSICAL');
    const [audioSelection, setAudioSelection] = useState<AudioSelection>('speakerPartitioning');
    const [audioDetails, setAudioDetails] = useState<AudioDetails>({
        speakerPartitioning: { maxSpeakers: 2 },
        channelIdentification: { channel1: 'CLINICIAN' },
    });
    const [filePath, setFilePath] = useState<File>();
    const [outputBucket, getUploadMetadata] = useS3();

    const [submissionMode, setSubmissionMode] = useState<string>('uploadAudio');
    const [recordedAudio, setRecordedAudio] = useState<File | undefined>();

    const fileToken = useMemo(() => {
        if (!filePath) {
            return undefined;
        } else {
            return {
                label: filePath.name,
                description: `Size: ${Number((filePath.size / 1000).toFixed(2)).toLocaleString()} kB`,
            };
        }
    }, [filePath]);

    function s3UploadCallback({ loaded, total }: Progress) {
        const value = Math.round(((loaded || 1) / (total || 100)) * 99);
        const loadedMb = Math.round((loaded || 1) / 1024 / 1024);
        const totalMb = Math.round((total || 1) / 1024 / 1024);
        updateProgressBar({
            id: `New Job: ${jobName}`,
            value: value,
            description: `Uploaded ${loadedMb}MB / ${totalMb}MB`,
        });
    }

    async function submitJob(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError('');

        if (!jobName) {
            setFormError('Job name is required');
            setIsSubmitting(false);
            return;
        }

        const uploadLocation = getUploadMetadata();
        const s3Location = {
            Bucket: uploadLocation.bucket,
            Key: `${uploadLocation.key}/${(filePath as File).name}`,
        };
        const s3Uri = `s3://${s3Location.Bucket}/${s3Location.Key}`;

        window.scrollTo(0, 0);

        updateProgressBar({
            id: `New Job: ${jobName}`,
            value: 0,
            description: 'Upload to S3 in progress...',
        });

        try {
            await fileUpload({
                ...s3Location,
                Body: filePath as File,
                ContentType: filePath?.type,
                callbackFn: s3UploadCallback,
            });
        } catch (e) {
            updateProgressBar({
                id: `New Job: ${jobName}`,
                type: 'error',
                value: 0,
                description: 'Uploading files to S3 failed',
                additionalInfo: `Error uploading ${filePath!.name}: ${(e as Error).message}`,
            });
            setIsSubmitting(false);
            throw e;
        }

        try {
            const result = await startJob(jobName, s3Uri);
            if (result?.MedicalTranscriptionJob?.TranscriptionJobStatus) {
                updateProgressBar({
                    id: `New Job: ${jobName}`,
                    type: 'success',
                    value: 100,
                    description: 'Transcription job submitted',
                    additionalInfo: `Job started at ${dayjs(result.MedicalTranscriptionJob.StartTime).format('MM/DD/YYYY hh:mm A')}. Redirecting...`,
                });
                await sleep(5000);
                navigate('/conversations');
            } else {
                updateProgressBar({
                    id: `New Job: ${jobName}`,
                    type: 'info',
                    value: 100,
                    description: 'Unable to confirm job submission',
                    additionalInfo: `Response: ${JSON.stringify(result)}`,
                });
            }
        } catch (e) {
            updateProgressBar({
                id: `New Job: ${jobName}`,
                type: 'error',
                value: 0,
                description: 'Submitting job failed',
                additionalInfo: `Error: ${(e as Error).message} `,
            });
            setIsSubmitting(false);
            throw e;
        }

        setIsSubmitting(false);
    }

    useEffect(() => {
        setFilePath(recordedAudio);
    }, [recordedAudio]);

    return (
        <ContentLayout
            headerVariant={'high-contrast'}
            header={
                <Header
                    description="Upload your audio file to be processed by AWS Transcribe Medical & Bedrock"
                    variant="awsui-h1-sticky"
                >
                    New Consultation
                </Header>
            }
        >
            <Container>
                <form onSubmit={(e) => submitJob(e)}>
                    <Form
                        errorText={formError}
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button formAction="submit" variant="primary" disabled={!filePath || isSubmitting}>
                                    {isSubmitting ? <Spinner /> : "Submit"}
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        <SpaceBetween direction="vertical" size="xl">
                            <InputName jobName={jobName} setJobName={setJobName} />

                            <FormField label="Audio source">
                                <SpaceBetween direction="vertical" size="xl">
                                    <div className={styles.submissionModeRadio}>
                                        <RadioGroup
                                            ariaLabel="submissionMode"
                                            onChange={({ detail }) => setSubmissionMode(detail.value)}
                                            value={submissionMode}
                                            items={[
                                                { value: 'uploadAudio', label: 'Upload Audio' },
                                                { value: 'liveRecording', label: 'Live Record' },
                                            ]}
                                        />
                                    </div>
                                    {submissionMode === 'liveRecording' ? (
                                        <AudioRecorder setRecordedAudio={setRecordedAudio} />
                                    ) : (
                                        <FormField label="Select Files">
                                            <AudioDropzone setFilePath={setFilePath} setFormError={setFormError} />
                                            <TokenGroup
                                                onDismiss={() => setFilePath(undefined)}
                                                items={fileToken ? [fileToken] : []}
                                                alignment="vertical"
                                                limit={1}
                                            />
                                        </FormField>
                                    )}
                                </SpaceBetween>
                            </FormField>
                        </SpaceBetween>
                    </Form>
                </form>
            </Container>
        </ContentLayout>
    );
}
