const content = {
    intro: {
        title: "Introduction",
        html: `
            <p>Welcome to the <strong>Sydney Edition (ap-southeast-2)</strong> of the AWS Clinical Assistant Workshop.</p>
            <p>In this self-paced lab, you will deploy a Clinical Assistant that listens to doctor-patient conversations, transcribes them, and generates a SOAP note.</p>
            
            <div class="callout">
                <span class="callout-title">The Objective</span>
                You will deploy a complete Serverless architecture using <strong>AWS CDK</strong>, configure a React frontend, and test the "Adapter Pattern" logic that replaces AWS HealthScribe with <strong>Transcribe Medical</strong> and <strong>Amazon Bedrock</strong>.
            </div>

            <h3>Workshop Steps</h3>
            <ul>
                <li><strong>Module 1:</strong> Deploy the Backend (CDK).</li>
                <li><strong>Module 2:</strong> Architecture Deep Dive (While you wait).</li>
                <li><strong>Module 3:</strong> Connect the Frontend.</li>
                <li><strong>Module 4:</strong> Run and Validate.</li>
            </ul>
        `,
        next: 'module1'
    },
    module1: {
        title: "Module 1: Infrastructure",
        html: `
            <p>We will start by provisioning the backend resources (Cognito, S3, IAM Roles) using the AWS Cloud Development Kit (CDK).</p>
            
            <h3>1. Install Backend Dependencies</h3>
            <p>Open your terminal to the project root and run:</p>
            <pre><code>cd infrastructure
npm install</code></pre>

            <h3>2. Deploy the Stack</h3>
            <p>Run the deployment command. When prompted to confirm security changes (IAM roles), type <code>y</code> and hit Enter.</p>
            <pre><code>cdk deploy</code></pre>

            <div class="callout">
                <span class="callout-title">⚠️ Do not close your terminal!</span>
                This process takes about 5 minutes. When it finishes, it will output green text containing your <strong>Bucket Name</strong>, <strong>User Pool ID</strong>, and other keys. You will need these for Module 3.
            </div>

            <p><em>While the stack deploys, click "Next" to understand the custom architecture you are building.</em></p>
        `,
        prev: 'intro',
        next: 'module2' 
    },
    module2: {
        title: "Module 2: The Architecture",
        html: `
            <p>Since AWS HealthScribe is not available in the Sydney region, this application uses a custom "Adapter Pattern" to replicate its functionality.</p>

            <h3>1. The Orchestrator</h3>
            <p>In <code>src/components/Conversation/Conversation.tsx</code>, we have replaced the single API call with a parallel execution strategy:</p>
            <pre><code>// The Sydney Adapter Logic
const [summary, entities] = await Promise.all([
    generateClinicalNote(rawText), // Bedrock (Claude 3.5 Sonnet)
    detectEntities(rawText)        // Comprehend Medical
]);</code></pre>

            <h3>2. Speaker Diarization</h3>
            <p>To distinguish between Doctor and Patient, we manually enable speaker labels in the Transcribe configuration (<code>src/utils/HealthScribeApi/index.ts</code>):</p>
            <pre><code>Settings: {
    ShowSpeakerLabels: true,
    MaxSpeakerLabels: 2 // Doctor + Patient
}</code></pre>

            <h3>3. The Data Mapper</h3>
            <p>The UI expects a specific nested JSON format. We use <code>src/utils/DataMapper.ts</code> to convert our raw Transcribe/Bedrock output into the HealthScribe format, ensuring the UI components work without modification.</p>
        `,
        prev: 'module1',
        next: 'module3'
    },
    module3: {
        title: "Module 3: Configuration",
        html: `
            <p>Once your CDK deployment (Module 1) is complete, we must connect the React frontend to the backend resources.</p>
            
            <h3>1. Retrieve Outputs</h3>
            <p>Look at your terminal. You should see an <strong>Outputs</strong> section similar to this:</p>
            <pre><code>StartUpStack.BucketName = ...
StartUpStack.UserPoolId = ...
StartUpStack.UserPoolClientId = ...
StartUpStack.IdentityPoolId = ...</code></pre>

            <h3>2. Create Environment File</h3>
            <p>Return to the <strong>project root directory</strong> (<code>cd ..</code> if you are still in infrastructure). Create a new file named <code>.env.local</code>.</p>
            
            <h3>3. Populate Variables</h3>
            <p>Copy the values from your terminal into the file, strictly following this format:</p>
            <pre><code>VITE_AWS_REGION=ap-southeast-2
VITE_BUCKET_NAME=<span style="color:#fbbf24">[Paste BucketName]</span>
VITE_USER_POOL_ID=<span style="color:#fbbf24">[Paste UserPoolId]</span>
VITE_USER_POOL_CLIENT_ID=<span style="color:#fbbf24">[Paste UserPoolClientId]</span>
VITE_IDENTITY_POOL_ID=<span style="color:#fbbf24">[Paste IdentityPoolId]</span></code></pre>
        `,
        prev: 'module2',
        next: 'module4'
    },
    module4: {
        title: "Module 4: Run & Test",
        html: `
            <p>Configuration is complete! It is time to launch the Clinical Assistant.</p>
            
            <h3>1. Start the App</h3>
            <p>In the project root directory, install the frontend dependencies and start the local server:</p>
            <pre><code>npm install
npm run dev</code></pre>
            <p>Open the Local URL shown in your terminal (usually <code>http://localhost:5173</code>).</p>

            <h3>2. Validation Workflow</h3>
            <ol>
                <li><strong>Sign Up:</strong> The app uses Cognito. Create a new account with a valid email (verification code required).</li>
                <li><strong>New Conversation:</strong> Click the button in the top right.</li>
                <li><strong>Upload Audio:</strong> Use the provided sample audio files (e.g., <code>knee.wav</code>) or record your own.</li>
                <li><strong>Observe:</strong> Watch as the system transcribes in real-time (simulated) and then generates the clinical note.</li>
            </ol>

            <div class="callout">
                <span class="callout-title">Success Criteria</span>
                You should see the <strong>Transcript</strong> on the left and the <strong>AI Generated Note</strong> on the right, confirming the Adapter is working correctly.
            </div>
        `,
        prev: 'module3'
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
        link.onclick = () => setTimeout(renderContent, 0); 
        nav.appendChild(link);
    });
}

function renderContent() {
    const hash = window.location.hash.replace('#', '') || 'intro';
    const data = content[hash] || content.intro;
    const main = document.getElementById('main-content');

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

window.addEventListener('hashchange', renderContent);
if (!window.location.hash) window.location.hash = '#intro';
renderContent();
