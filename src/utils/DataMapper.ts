import { IHealthScribeTranscript, ITranscriptItem, ITranscriptSegment, IClinicalInsight, ISpan } from '@/types/HealthScribeTranscript';

export const mapTranscribeToHealthScribe = (
    transcribeJson: any,
    bedrockSummary: any,
    comprehendEntities: any
): IHealthScribeTranscript => {
    // 1. Map Transcript Items
    // Transcribe items have start_time/end_time as strings, or missing for punctuation
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

    // 2. Map Transcript Segments (using speaker labels if available, or just one big segment)
    const segments: ITranscriptSegment[] = [];
    const speakerSegments = transcribeJson.results?.speaker_labels?.segments;

    if (speakerSegments && speakerSegments.length > 0) {
        speakerSegments.forEach((seg: any) => {
            const startTime = parseFloat(seg.start_time);
            const endTime = parseFloat(seg.end_time);
            const speakerLabel = seg.speaker_label; // e.g., "spk_0"

            // Map spk_0 to CLINICIAN by default for demo purposes
            const role = speakerLabel === 'spk_0' ? 'CLINICIAN' : 'PATIENT';

            // Reconstruct content from items
            // seg.items is array of { start_time, end_time, speaker_label } but indices are implicitly matched by time?
            // Actually Transcribe speaker_labels.segments has 'items' array which contains objects like { start_time, end_time, speaker_label }.
            // It doesn't give direct index into results.items.
            // We need to find items that fall within this time range.

            const segmentItems = transcriptItems.filter(item =>
                item.BeginAudioTime >= startTime && item.EndAudioTime <= endTime && item.Type !== 'punctuation'
            );

            // Getting simple text content for the segment
            // This is an approximation. A robust solution would map indices carefully.
            // For the demo, aggregating text is likely enough.
            const content = segmentItems.map(i => i.Content).join(' ');

            segments.push({
                SegmentId: `${startTime}-${endTime}`,
                BeginAudioTime: startTime,
                EndAudioTime: endTime,
                Content: content,
                ParticipantDetails: { ParticipantRole: role },
                SectionDetails: { SectionName: 'Transcript' } // Generic section
            });
        });
    } else {
        // Fallback if no speaker labels
        segments.push({
            SegmentId: '1',
            BeginAudioTime: transcriptItems[0]?.BeginAudioTime || 0,
            EndAudioTime: transcriptItems[transcriptItems.length - 1]?.EndAudioTime || 0,
            Content: transcribeJson.results?.transcripts?.[0]?.transcript || '',
            ParticipantDetails: { ParticipantRole: 'CLINICIAN' },
            SectionDetails: { SectionName: 'Transcript' }
        });
    }

    // 3. Map Clinical Insights (Comprehend Medical)
    const clinicalInsights: IClinicalInsight[] = (comprehendEntities.Entities || []).map((entity: any) => ({
        InsightId: entity.Id?.toString() || `${Math.random()}`,
        Type: entity.Category,
        Category: entity.Type,
        InsightType: entity.Category, // Mapping duplicate fields just in case
        Spans: (entity.Traits || []).map((trait: any) => ({
            // Trait spans usually refer to the entity text? 
            // Actually Comprehend Medical Entities have 'BeginOffset' and 'EndOffset'.
            // 'Traits' are attributes like NEGATION.
            // The UI expects 'Spans' for highlighting.
            // We should map the Entity's own offsets to a Span.
            BeginCharacterOffset: entity.BeginOffset,
            EndCharacterOffset: entity.EndOffset,
            Content: entity.Text,
            SegmentId: '1' // We might need to find which segment this belongs to, but '1' might work if we are lucky or if UI ignores it
        })),
        Attributes: (entity.Attributes || []).map((attr: any) => ({
            AttributeId: attr.Id?.toString(),
            Type: attr.Type,
            Spans: [{
                BeginCharacterOffset: attr.BeginOffset,
                EndCharacterOffset: attr.EndOffset,
                Content: attr.Text,
                SegmentId: '1'
            }]
        }))
    }));

    // Also need to push the Entity itself as a Span if Traits are empty?
    // The IClinicalInsight interface has 'Spans: ISpan[]'.
    // If we look at HealthScribeTranscript.ts, Spans are used for highlighting.
    // It seems we should put the entity location there.
    // Let's ensure the main entity span is included.
    clinicalInsights.forEach(insight => {
        if (!insight.Spans || insight.Spans.length === 0) {
            const entity = (comprehendEntities.Entities || []).find((e: any) => e.Id?.toString() === insight.InsightId);
            if (entity) {
                insight.Spans = [{
                    BeginCharacterOffset: entity.BeginOffset,
                    EndCharacterOffset: entity.EndOffset,
                    Content: entity.Text,
                    SegmentId: '1' // simplified
                }];
            }
        }
    });

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
