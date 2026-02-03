import { IHealthScribeTranscript, ITranscriptItem, ITranscriptSegment, IClinicalInsight, ISpan } from '@/types/HealthScribeTranscript';

export const mapTranscribeToHealthScribe = (
    transcribeJson: any,
    bedrockSummary: any,
    comprehendEntities: any
): IHealthScribeTranscript => {
    // 1. Map Transcript Items
    const transcriptItems: ITranscriptItem[] = (transcribeJson.results?.items || []).map((item: any) => {
        const isPunctuation = item.type === 'punctuation';
        const startTime = parseFloat(item.start_time || '0');
        const endTime = parseFloat(item.end_time || '0');
        const content = item.alternatives?.[0]?.content || '';
        const confidence = parseFloat(item.alternatives?.[0]?.confidence || '1.0');

        return {
            BeginAudioTime: startTime,
            EndAudioTime: endTime,
            Type: isPunctuation ? 'punctuation' : 'pronunciation',
            Content: content,
            Confidence: confidence,
            Alternatives: item.alternatives?.map((alt: any) => ({
                Content: alt.content,
                Confidence: parseFloat(alt.confidence || '1.0')
            }))
        };
    });

    // 2. Map Transcript Segments
    const segments: ITranscriptSegment[] = [];
    const speakerSegments = transcribeJson.results?.speaker_labels?.segments;
    let segmentIndex = 0;

    if (speakerSegments && speakerSegments.length > 0) {
        speakerSegments.forEach((seg: any) => {
            const startTime = parseFloat(seg.start_time);
            const endTime = parseFloat(seg.end_time);
            const speakerLabel = seg.speaker_label;
            const role = speakerLabel === 'spk_0' ? 'CLINICIAN' : 'PATIENT';

            const segmentItems = transcriptItems.filter(item =>
                item.BeginAudioTime >= startTime && item.EndAudioTime <= endTime && item.Type !== 'punctuation'
            );
            const content = segmentItems.map(i => i.Content).join(' ');

            segments.push({
                SegmentId: `seg-${segmentIndex++}`,
                BeginAudioTime: startTime,
                EndAudioTime: endTime,
                Content: content,
                ParticipantDetails: { ParticipantRole: role },
                SectionDetails: { SectionName: 'Transcript' }
            });
        });
    } else {
        segments.push({
            SegmentId: 'seg-0',
            BeginAudioTime: transcriptItems[0]?.BeginAudioTime || 0,
            EndAudioTime: transcriptItems[transcriptItems.length - 1]?.EndAudioTime || 0,
            Content: transcribeJson.results?.transcripts?.[0]?.transcript || '',
            ParticipantDetails: { ParticipantRole: 'CLINICIAN' },
            SectionDetails: { SectionName: 'Transcript' }
        });
    }

    // 3. Map Clinical Insights - use first segment ID for all spans (simplified)
    const firstSegmentId = segments[0]?.SegmentId || 'seg-0';
    const clinicalInsights: IClinicalInsight[] = (comprehendEntities.Entities || []).map((entity: any) => ({
        InsightId: entity.Id?.toString() || `${Math.random()}`,
        Type: entity.Category,
        Category: entity.Type,
        InsightType: entity.Category,
        Spans: [{
            BeginCharacterOffset: entity.BeginOffset,
            EndCharacterOffset: entity.EndOffset,
            Content: entity.Text,
            SegmentId: firstSegmentId
        }],
        Attributes: (entity.Attributes || []).map((attr: any) => ({
            AttributeId: attr.Id?.toString(),
            Type: attr.Type,
            Spans: [{
                BeginCharacterOffset: attr.BeginOffset,
                EndCharacterOffset: attr.EndOffset,
                Content: attr.Text,
                SegmentId: firstSegmentId
            }]
        }))
    }));

    return {
        Conversation: {
            ConversationId: transcribeJson.jobName || 'conversation-1',
            LanguageCode: 'en-US',
            SessionId: '1',
            TranscriptSegments: segments,
            TranscriptItems: transcriptItems,
            ClinicalInsights: clinicalInsights
        }
    };
};
