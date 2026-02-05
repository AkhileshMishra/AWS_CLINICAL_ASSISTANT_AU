import React, { RefObject, useMemo, useState } from 'react';
import { Container, Header, SpaceBetween, Box, ExpandableSection, Button } from '@cloudscape-design/components';
import WaveSurfer from 'wavesurfer.js';

import { ExtractedHealthData } from '@/types/ComprehendMedical';
import { ITranscriptSegment } from '@/types/HealthScribeTranscript';
import { getInferredData } from '@/utils/ComprehendMedicalApi';
import toTitleCase from '@/utils/toTitleCase';

import { HighlightId } from '../types';
import { RightPanelActions, RightPanelSettings } from './RightPanelComponents';
import SummarizedConcepts from './SummarizedConcepts';

interface RightPanelProps {
    loading: boolean;
    summary: any;
    transcript?: any;
    highlightId?: HighlightId;
    setHighlightId?: React.Dispatch<React.SetStateAction<HighlightId>>;
    wavesurfer?: RefObject<WaveSurfer | undefined>;
}

export default function RightPanel({ 
    loading, 
    summary, 
    transcript,
    highlightId = { allSegmentIds: [], selectedSegmentId: '' },
    setHighlightId = () => {},
    wavesurfer
}: RightPanelProps) {
    const [rightPanelSettingsOpen, setRightPanelSettingsOpen] = useState(false);
    const [acceptableConfidence, setAcceptableConfidence] = useState(75);
    const [extractedHealthData, setExtractedHealthData] = useState<ExtractedHealthData[]>([]);
    const [extractingData, setExtractingData] = useState(false);
    const [dataExtracted, setDataExtracted] = useState(false);

    // Build segmentById lookup from transcript
    const segmentById = useMemo(() => {
        if (!transcript?.Conversation?.TranscriptSegments) return {};
        return transcript.Conversation.TranscriptSegments.reduce(
            (acc: { [key: string]: ITranscriptSegment }, seg: ITranscriptSegment) => {
                acc[seg.SegmentId] = seg;
                return acc;
            },
            {}
        );
    }, [transcript]);

    // Convert SOAP summary to sections format for SummarizedConcepts
    const sections = useMemo(() => {
        if (!summary || summary.Error) return [];
        
        const soapKeys = ['Subjective', 'Objective', 'Assessment', 'Plan'];
        return Object.entries(summary)
            .filter(([key]) => soapKeys.includes(key) || !['Error'].includes(key))
            .map(([key, value]) => ({
                SectionName: key.toUpperCase().replace(/ /g, '_'),
                Summary: [{
                    SummarizedSegment: String(value),
                    EvidenceLinks: transcript?.Conversation?.TranscriptSegments?.slice(0, 1).map((s: any) => ({ SegmentId: s.SegmentId })) || []
                }]
            }));
    }, [summary, transcript]);

    const hasInsightSections = sections.length > 0;

    // Extract health data using Comprehend Medical
    const handleExtractHealthData = async () => {
        if (!sections.length) return;
        
        setExtractingData(true);
        try {
            const extractedData: ExtractedHealthData[] = [];
            
            for (const section of sections) {
                const sectionText = section.Summary.map(s => s.SummarizedSegment).join(' ');
                
                const [icd10, rxnorm, snomedct] = await Promise.all([
                    getInferredData('icd10cm', sectionText).catch(() => ({ Entities: [] })),
                    getInferredData('rxnorm', sectionText).catch(() => ({ Entities: [] })),
                    getInferredData('snomedct', sectionText).catch(() => ({ Entities: [] }))
                ]);

                extractedData.push({
                    SectionName: section.SectionName,
                    ExtractedEntities: [
                        icd10 as any,
                        rxnorm as any,
                        snomedct as any
                    ].filter(e => e?.Entities?.length > 0)
                });
            }
            
            setExtractedHealthData(extractedData);
            setDataExtracted(true);
        } catch (e) {
            console.error('Extract health data error:', e);
        } finally {
            setExtractingData(false);
        }
    };

    if (loading) {
        return (
            <Container header={<Header variant="h2">Insights</Header>}>
                <Box textAlign="center" color="text-status-inactive">
                    Generative AI is writing clinical notes...
                </Box>
            </Container>
        );
    }

    if (!summary || summary.Error) {
        return (
            <Container header={<Header variant="h2">Insights</Header>}>
                <Box textAlign="center" color="text-status-inactive">
                    {summary?.Error || 'No summary available.'}
                </Box>
            </Container>
        );
    }

    return (
        <Container
            header={
                <Header
                    variant="h2"
                    actions={
                        <RightPanelActions
                            hasInsightSections={hasInsightSections}
                            dataExtracted={dataExtracted}
                            extractingData={extractingData}
                            clinicalDocumentNereUnits={0}
                            setRightPanelSettingsOpen={setRightPanelSettingsOpen}
                            handleExtractHealthData={handleExtractHealthData}
                        />
                    }
                >
                    Insights
                </Header>
            }
        >
            <RightPanelSettings
                rightPanelSettingsOpen={rightPanelSettingsOpen}
                setRightPanelSettingsOpen={setRightPanelSettingsOpen}
                acceptableConfidence={acceptableConfidence}
                setAcceptableConfidence={setAcceptableConfidence}
            />
            
            {hasInsightSections && wavesurfer ? (
                <SummarizedConcepts
                    sections={sections}
                    extractedHealthData={extractedHealthData}
                    acceptableConfidence={acceptableConfidence}
                    highlightId={highlightId}
                    setHighlightId={setHighlightId}
                    segmentById={segmentById}
                    wavesurfer={wavesurfer}
                />
            ) : (
                <SpaceBetween size="l">
                    {Object.entries(summary).map(([key, value]) => (
                        <ExpandableSection key={key} headerText={toTitleCase(key)} defaultExpanded>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{String(value)}</div>
                        </ExpandableSection>
                    ))}
                </SpaceBetween>
            )}
        </Container>
    );
}
