const content = {
    intro: {
        title: "Introduction",
        html: `
            <p>Welcome to the <strong>Sydney Edition (ap-southeast-2)</strong> of the AWS Clinical Assistant Workshop.</p>
            <p>The standard workshop relies on <strong>AWS HealthScribe</strong>, a service not yet available in the Sydney region. This guide provides a complete, architectural workaround that replicates HealthScribe's functionality using services that <em>are</em> available in Sydney.</p>
            
            <div class="callout">
                <span class="callout-title">Goal</span>
                Build a Clinical Assistant that listens to doctor-patient conversations, transcribes them, and generates a SOAP note, entirely within the Sydney Region.
            </div>

            <h2>The Solution Architecture</h2>
            <p>Instead of the single API call to HealthScribe, we implement an "Adapter Pattern" logic orchestrating three services:</p>
            <ul>
                <li><strong>AWS Transcribe Medical</strong>: For real-time or batch audio transcription (including Speaker Diarization).</li>
                <li><strong>Amazon Bedrock (Claude 3 Haiku)</strong>: For generating the SOAP note summary.</li>
                <li><strong>Amazon Comprehend Medical</strong>: For extracting clinical entities (Medication, Anatomy, etc.).</li>
            </ul>
        `,
        next: 'prereq'
    },
    prereq: {
        title: "Module 1: Infrastructure Prerequisites",
        html: `
            <p>Before starting the coding implementation, you need the backend infrastructure.</p>
            
            <h3>Required Outputs</h3>
            <p>Ensure you have deployed a stack (or manually created resources) providing:</p>
            <ul>
                <li><strong>S3 Bucket Name</strong> (for audio/transcripts)</li>
                <li><strong>Cognito User Pool ID</strong> & <strong>Client ID</strong></li>
                <li><strong>Cognito Identity Pool ID</strong></li>
                <li><strong>Region</strong>: ap-southeast-2</li>
            </ul>

            <div class="callout">
                <span class="callout-title">IAM Permissions</span>
                Your Authenticated Role must have permissions for:
                <code>transcribe:StartMedicalTranscriptionJob</code>, 
                <code>bedrock:InvokeModel</code>, and 
                <code>comprehendmedical:DetectEntitiesV2</code>.
            </div>
        `,
        prev: 'intro',
        next: 'frontend'
    },
    frontend: {
        title: "Module 2: Frontend Configuration",
        html: `
            <p>We have removed the auto-generated <code>amplify/</code> folder. You must manually configure the application.</p>
            
            <h3>1. Environment Variables</h3>
            <p>Create a file named <code>.env.local</code> in the root directory:</p>
            <pre><code>VITE_AWS_REGION=ap-southeast-2
VITE_BUCKET_NAME=your-bucket-name
VITE_USER_POOL_ID=your-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-client-id
VITE_IDENTITY_POOL_ID=your-identity-pool-id</code></pre>

            <h3>2. Manual Amplify Config</h3>
            <p>In <code>src/main.tsx</code>, we configure Amplify manually instead of importing <code>aws-exports</code>.</p>
            <pre><code>Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      // ... other config
    }
  },
  // ... Storage config
});</code></pre>
        `,
        prev: 'prereq',
        next: 'adapter'
    },
    adapter: {
        title: "Module 3: The Sydney Adapter",
        html: `
            <p>This is the core of the migration. We replace the HealthScribe API client with our custom orchestration logic.</p>

            <h3>1. The Data Key: Speaker Labels</h3>
            <p>To distinguish between the Doctor and Patient (which HealthScribe does automatically), we must enable <strong>Speaker Diarization</strong> in Transcribe.</p>
            <pre><code>// src/utils/HealthScribeApi/index.ts
const command = new StartMedicalTranscriptionJobCommand({
    // ...
    Settings: {
        ShowSpeakerLabels: true,
        MaxSpeakerLabels: 2
    },
    Tags: [
        { Key: "Solution", Value: "AWS_CLINICAL_ASSISTANT_AU" }
    ]
});</code></pre>

            <h3>2. The Orchestrator</h3>
            <p>In <code>src/components/Conversation/Conversation.tsx</code>, we replace the single fetch call with a Promise.all approach:</p>
            <pre><code>const [summary, entities] = await Promise.all([
    generateClinicalNote(rawText), // Bedrock
    detectEntities(rawText)        // Comprehend
]);
// Then map specific Transcribe JSON to HealthScribe format</code></pre>
        `,
        prev: 'frontend',
        next: 'mapper'
    },
    mapper: {
        title: "Module 4: The Data Mapper",
        html: `
            <p>The UI expects a complex nested JSON structure. We created <code>src/utils/DataMapper.ts</code> to synthesize this.</p>
            
            <h3>Why is this needed?</h3>
            <p>Transcribe returns a flat list of items. HealthScribe returns "formatted segments". The Mapper converts the former to the latter.</p>

            <pre><code>export const mapTranscribeToHealthScribe = (transcribe, bedrock) => {
    return {
        Conversation: {
             TranscriptSegments: buildSegments(transcribe),
             ClinicalInsights: mapEntities(comprehend),
             // ...
        }
    }
}</code></pre>
            <p>This allows us to keep the beautiful <code>RightPanel.tsx</code> and <code>LeftPanel.tsx</code> components exactly as they are!</p>
        `,
        prev: 'adapter',
        next: 'verify'
    },
    verify: {
        title: "Validation",
        html: `
            <p>Your application is now ready.</p>
            
            <h3>Testing Steps</h3>
            <ol>
                <li>Run <code>npm run dev</code>.</li>
                <li>Login with a user created in Cognito.</li>
                <li>Click "New Conversation".</li>
                <li>Upload an audio file (doctor/patient interaction).</li>
                <li>Wait for processing (Transcribe -> Bedrock).</li>
                <li><strong>Success!</strong> You should see the transcript on the left and the SOAP note on the right.</li>
            </ol>

            <div class="callout">
                <span class="callout-title">Troubleshooting</span>
                If the Right Panel is empty, check the browser console. If Bedrock assumes a different JSON format, the UI might not render the sections. We enforced JSON output in the Bedrock prompt to prevent this.
            </div>
        `,
        prev: 'mapper'
    }
};

function renderNav() {
    const nav = document.getElementById('nav-menu');
    nav.innerHTML = '';

    Object.keys(content).forEach(key => {
        const item = content[key];
        const link = document.createElement('a');
        link.className = `nav-item ${window.location.hash === '#' + key ? 'active' : ''}`;
        link.innerText = item.title;
        link.href = '#' + key;
        link.onclick = () => setTimeout(renderContent, 0); // Hack to wait for hash change
        nav.appendChild(link);
    });
}

function renderContent() {
    // Default to intro if no hash
    const hash = window.location.hash.replace('#', '') || 'intro';
    const data = content[hash] || content.intro;

    const main = document.getElementById('main-content');

    // Build Footer Nav
    let footerHtml = '<div class="footer-nav">';
    if (data.prev) {
        footerHtml += `<a href="#${data.prev}" onclick="setTimeout(renderContent, 0)" class="nav-btn">← Previous</a>`;
    } else {
        footerHtml += '<div></div>';
    }
    if (data.next) {
        footerHtml += `<a href="#${data.next}" onclick="setTimeout(renderContent, 0)" class="nav-btn">Next →</a>`;
    }
    footerHtml += '</div>';

    main.innerHTML = `
        <h1>${data.title}</h1>
        ${data.html}
        ${footerHtml}
    `;

    renderNav();
}

// Initial Render
window.addEventListener('hashchange', renderContent);
if (!window.location.hash) window.location.hash = '#intro';
renderContent();
