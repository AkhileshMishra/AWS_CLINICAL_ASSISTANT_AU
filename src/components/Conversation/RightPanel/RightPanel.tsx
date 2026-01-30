import { Container, Header, SpaceBetween, Box } from '@cloudscape-design/components';

// Simple types for the Sydney SOAP note
interface SoapNote {
    Subjective?: string;
    Objective?: string;
    Assessment?: string;
    Plan?: string;
    [key: string]: string | undefined;
}

interface RightPanelProps {
    summary: SoapNote | null; // This now receives the Bedrock JSON
    loading: boolean;
}

export default function RightPanel({ summary, loading }: RightPanelProps) {

    if (loading) {
        return (
            <Container>
                <Box textAlign="center" color="text-status-inactive">
                    Generative AI is writing clinical notes...
                </Box>
            </Container>
        );
    }

    if (!summary) {
        return (
            <Container>
                <Box textAlign="center" color="text-status-inactive">
                    No summary available.
                </Box>
            </Container>
        );
    }

    // Render the SOAP Note Keys dynamically
    return (
        <SpaceBetween size="l">
            {Object.entries(summary).map(([key, value]) => (
                <Container key={key} header={<Header variant="h2">{key}</Header>}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{value}</div>
                </Container>
            ))}
        </SpaceBetween>
    );
}
