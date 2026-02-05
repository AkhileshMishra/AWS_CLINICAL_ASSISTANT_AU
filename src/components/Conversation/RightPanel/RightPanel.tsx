// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React, { RefObject, useCallback, useMemo, useState } from 'react';

import { DetectEntitiesV2Response } from '@aws-sdk/client-comprehendmedical';
import WaveSurfer from 'wavesurfer.js';

import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ExtractedHealthData } from '@/types/ComprehendMedical';
import { ISection } from '@/types/HealthScribeSummary';
import { ITranscriptSegment } from '@/types/HealthScribeTranscript';
import { detectEntitiesFromComprehendMedical } from '@/utils/ComprehendMedicalApi';

import LoadingContainer from '../Common/LoadingContainer';
import ScrollingContainer from '../Common/ScrollingContainer';
import { HighlightId } from '../types';
import { RightPanelActions, RightPanelSettings } from './RightPanelComponents';
import SummarizedConcepts from './SummarizedConcepts';
import { calculateNereUnits } from './rightPanelUtils';
import { processSummarizedSegment } from './summarizedConceptsUtils';

type RightPanelProps = {
    jobLoading: boolean;
    summary: any;
    transcript: any;
    highlightId: HighlightId;
    setHighlightId: React.Dispatch<React.SetStateAction<HighlightId>>;
    wavesurfer: RefObject<WaveSurfer | undefined>;
};

export default function RightPanel({
    jobLoading,
    summary,
    transcript,
    highlightId,
    setHighlightId,
    wavesurfer,
}: RightPanelProps) {
    const [extractingData, setExtractingData] = useState<boolean>(false);
    const [extractedHealthData, setExtractedHealthData] = useState<ExtractedHealthData[]>([]);
    const [rightPanelSettingsOpen, setRightPanelSettingsOpen] = useState<boolean>(false);
    const [acceptableConfidence, setAcceptableConfidence] = useLocalStorage<number>(
        'Insights-Comprehend-Medical-Confidence-Threshold',
        75.0
    );

    const segmentById: { [key: string]: ITranscriptSegment } = useMemo(() => {
        if (transcript == null) return {};
        return transcript.Conversation?.TranscriptSegments?.reduce((acc: any, seg: ITranscriptSegment) => {
            return { ...acc, [seg.SegmentId]: seg };
        }, {}) || {};
    }, [transcript]);

    // Convert Bedrock SOAP summary to HealthScribe sections format
    const sections: ISection[] = useMemo(() => {
        if (!summary || summary.Error) return [];
        
        // Get first segment ID for evidence links
        const firstSegmentId = transcript?.Conversation?.TranscriptSegments?.[0]?.SegmentId || 'seg-0';
        
        const sectionOrder = ['Subjective', 'Objective', 'Assessment', 'Plan'];
        const result: ISection[] = [];
        
        for (const key of sectionOrder) {
            if (summary[key]) {
                const content = String(summary[key]);
                // Split by newlines or periods to create multiple summary items
                const lines = content.split(/\n/).filter(line => line.trim());
                
                result.push({
                    SectionName: key.toUpperCase(),
                    Summary: lines.map(line => ({
                        SummarizedSegment: line.trim(),
                        EvidenceLinks: [{ SegmentId: firstSegmentId }]
                    }))
                });
            }
        }
        
        // Add any other keys not in SOAP
        for (const [key, value] of Object.entries(summary)) {
            if (!sectionOrder.includes(key) && key !== 'Error' && value) {
                const content = String(value);
                const lines = content.split(/\n/).filter(line => line.trim());
                
                result.push({
                    SectionName: key.toUpperCase().replace(/ /g, '_'),
                    Summary: lines.map(line => ({
                        SummarizedSegment: line.trim(),
                        EvidenceLinks: [{ SegmentId: transcript?.Conversation?.TranscriptSegments?.[0]?.SegmentId || 'seg-0' }]
                    }))
                });
            }
        }
        
        return result;
    }, [summary, transcript]);

    const hasInsightSections: boolean = useMemo(() => {
        return sections.length > 0;
    }, [sections]);

    const handleExtractHealthData = useCallback(async () => {
        if (sections.length === 0) return;
        setExtractingData(true);

        const buildExtractedHealthData: ExtractedHealthData[] = [];
        for (const section of sections) {
            const sectionEntities: DetectEntitiesV2Response[] = [];
            for (const summaryItem of section.Summary) {
                const summarizedSegment = processSummarizedSegment(summaryItem.SummarizedSegment);
                const detectedEntities = (await detectEntitiesFromComprehendMedical(
                    summarizedSegment
                )) as DetectEntitiesV2Response;
                sectionEntities.push(detectedEntities);
            }
            buildExtractedHealthData.push({
                SectionName: section.SectionName,
                ExtractedEntities: sectionEntities,
            });
        }
        setExtractedHealthData(buildExtractedHealthData);

        setExtractingData(false);
    }, [sections, setExtractingData, setExtractedHealthData]);

    // Calculate the number of CM units (100-character segments) in the clinical document.
    const clinicalDocumentNereUnits = useMemo(() => {
        // Simple calculation based on sections
        if (sections.length === 0) return 0;
        let totalChars = 0;
        sections.forEach(section => {
            section.Summary.forEach(s => {
                totalChars += processSummarizedSegment(s.SummarizedSegment).length;
            });
        });
        
        const eachSegment = sections.reduce((acc, { Summary }) => {
            return acc + Summary.reduce((a, { SummarizedSegment }) => {
                return a + Math.ceil(processSummarizedSegment(SummarizedSegment).length / 100);
            }, 0);
        }, 0);
        
        return {
            eachSegment,
            eachSection: Math.ceil(totalChars / 100),
            allAtOnce: Math.ceil(totalChars / 100),
        };
    }, [sections]);

    if (jobLoading || summary == null) {
        return <LoadingContainer containerTitle="Insights" text="Loading Insights" />;
    } else {
        return (
            <ScrollingContainer
                containerTitle="Insights"
                containerActions={
                    <RightPanelActions
                        hasInsightSections={hasInsightSections}
                        dataExtracted={extractedHealthData.length > 0}
                        extractingData={extractingData}
                        clinicalDocumentNereUnits={clinicalDocumentNereUnits}
                        setRightPanelSettingsOpen={setRightPanelSettingsOpen}
                        handleExtractHealthData={handleExtractHealthData}
                    />
                }
            >
                <RightPanelSettings
                    rightPanelSettingsOpen={rightPanelSettingsOpen}
                    setRightPanelSettingsOpen={setRightPanelSettingsOpen}
                    acceptableConfidence={acceptableConfidence}
                    setAcceptableConfidence={setAcceptableConfidence}
                />
                <SummarizedConcepts
                    sections={sections}
                    extractedHealthData={extractedHealthData}
                    acceptableConfidence={acceptableConfidence}
                    highlightId={highlightId}
                    setHighlightId={setHighlightId}
                    segmentById={segmentById}
                    wavesurfer={wavesurfer}
                />
            </ScrollingContainer>
        );
    }
}
