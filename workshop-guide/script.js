const content = {
    intro: {
        title: "Welcome",
        html: `
            <p>Welcome to the <strong>AWS Clinical Assistant Workshop - Sydney Edition</strong>.</p>
            <p>In this self-paced lab, you will deploy a fully functional Clinical Assistant that:</p>
            <ul>
                <li>Records or accepts audio uploads of doctor-patient conversations</li>
                <li>Transcribes the audio using <strong>AWS Transcribe Medical</strong></li>
                <li>Generates structured SOAP notes using <strong>Amazon Bedrock (Claude)</strong></li>
                <li>Extracts medical entities using <strong>Amazon Comprehend Medical</strong></li>
            </ul>
            
            <div class="callout">
                <span class="callout-title">⏱️ Estimated Time</span>
                This workshop takes approximately <strong>45-60 minutes</strong> to complete.
            </div>

            <h3>Workshop Modules</h3>
            <ol>
                <li><strong>Prerequisites:</strong> Install required tools on your machine</li>
                <li><strong>AWS Setup:</strong> Configure your AWS account and enable Bedrock</li>
                <li><strong>Get the Code:</strong> Clone the repository</li>
                <li><strong>Deploy Infrastructure:</strong> Deploy backend using AWS CDK</li>
                <li><strong>Architecture:</strong> Understand what you're building</li>
                <li><strong>Configure App:</strong> Connect frontend to backend</li>
                <li><strong>Run & Test:</strong> Launch and validate the application</li>
                <li><strong>Troubleshooting:</strong> Common issues and solutions</li>
            </ol>

            <h3>What You'll Need</h3>
            <ul>
                <li>A computer (Windows, Mac, or Linux)</li>
                <li>An AWS Account with administrator access</li>
                <li>Internet connection</li>
                <li>About 1 hour of time</li>
            </ul>
        `,
        next: 'prereq'
    },
    prereq: {
        title: "Module 1: Prerequisites",
        html: `
            <p>Before we begin, you need to install several tools on your computer. Follow the instructions for your operating system.</p>

            <h2>1. Node.js (Required)</h2>
            <p>Node.js is a JavaScript runtime needed to run the application and AWS CDK.</p>
            
            <h3>Check if already installed:</h3>
            <pre><code>node --version</code></pre>
            <p>If you see a version number (v18 or higher), skip to step 2.</p>

            <h3>Install on macOS:</h3>
            <pre><code># Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org (LTS version)</code></pre>

            <h3>Install on Windows:</h3>
            <ol>
                <li>Go to <a href="https://nodejs.org" target="_blank">https://nodejs.org</a></li>
                <li>Download the <strong>LTS</strong> version (green button)</li>
                <li>Run the installer, accept defaults</li>
                <li>Restart your terminal/PowerShell after installation</li>
            </ol>

            <h3>Install on Linux (Ubuntu/Debian):</h3>
            <pre><code>curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs</code></pre>

            <hr>

            <h2>2. AWS CLI (Required)</h2>
            <p>The AWS Command Line Interface lets you interact with AWS services.</p>

            <h3>Check if already installed:</h3>
            <pre><code>aws --version</code></pre>

            <h3>Install on macOS:</h3>
            <pre><code>brew install awscli</code></pre>

            <h3>Install on Windows:</h3>
            <ol>
                <li>Download: <a href="https://awscli.amazonaws.com/AWSCLIV2.msi" target="_blank">https://awscli.amazonaws.com/AWSCLIV2.msi</a></li>
                <li>Run the MSI installer</li>
                <li>Restart PowerShell after installation</li>
            </ol>

            <h3>Install on Linux:</h3>
            <pre><code>curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install</code></pre>

            <hr>

            <h2>3. AWS CDK (Required)</h2>
            <p>The AWS Cloud Development Kit deploys infrastructure as code.</p>

            <h3>Install (all platforms):</h3>
            <pre><code>npm install -g aws-cdk</code></pre>

            <h3>Verify installation:</h3>
            <pre><code>cdk --version</code></pre>

            <hr>

            <h2>4. Git (Required)</h2>
            <p>Git is needed to clone the workshop repository.</p>

            <h3>Check if already installed:</h3>
            <pre><code>git --version</code></pre>

            <h3>Install on macOS:</h3>
            <pre><code>brew install git</code></pre>

            <h3>Install on Windows:</h3>
            <p>Download from <a href="https://git-scm.com/download/win" target="_blank">https://git-scm.com/download/win</a></p>

            <h3>Install on Linux:</h3>
            <pre><code>sudo apt-get install git</code></pre>

            <hr>

            <h2>5. Code Editor (Recommended)</h2>
            <p>Any text editor works. We recommend <a href="https://code.visualstudio.com" target="_blank">VS Code</a>.</p>

            <div class="callout">
                <span class="callout-title">✅ Checklist</span>
                Before proceeding, verify all tools are installed:
                <pre><code>node --version    # Should show v18+ 
npm --version     # Should show 9+
aws --version     # Should show aws-cli/2.x
cdk --version     # Should show 2.x
git --version     # Should show 2.x</code></pre>
            </div>
        `,
        prev: 'intro',
        next: 'awssetup'
    },
    awssetup: {
        title: "Module 2: AWS Setup",
        html: `
            <p>Now we'll configure your AWS credentials and enable the required AI services.</p>

            <h2>1. Configure AWS Credentials</h2>
            <p>You need AWS credentials with administrator access.</p>

            <h3>Option A: Using IAM Identity Center (Recommended for organizations)</h3>
            <pre><code>aws configure sso</code></pre>
            <p>Follow the prompts to authenticate via your browser.</p>

            <h3>Option B: Using Access Keys</h3>
            <p>If you have an IAM user with access keys:</p>
            <pre><code>aws configure</code></pre>
            <p>Enter when prompted:</p>
            <ul>
                <li><strong>AWS Access Key ID:</strong> Your access key</li>
                <li><strong>AWS Secret Access Key:</strong> Your secret key</li>
                <li><strong>Default region name:</strong> <code>ap-southeast-2</code></li>
                <li><strong>Default output format:</strong> <code>json</code></li>
            </ul>

            <h3>Verify credentials work:</h3>
            <pre><code>aws sts get-caller-identity</code></pre>
            <p>You should see your account ID and user/role information.</p>

            <hr>

            <h2>2. Enable Amazon Bedrock Model Access</h2>
            <p><strong>⚠️ CRITICAL STEP:</strong> The application uses Claude AI models. You must enable access in the AWS Console.</p>

            <ol>
                <li>Open the AWS Console: <a href="https://console.aws.amazon.com" target="_blank">https://console.aws.amazon.com</a></li>
                <li>In the top-right, ensure region is set to <strong>Sydney (ap-southeast-2)</strong></li>
                <li>Search for <strong>"Bedrock"</strong> in the search bar</li>
                <li>Click <strong>Amazon Bedrock</strong></li>
                <li>In the left sidebar, click <strong>Model access</strong></li>
                <li>Click <strong>Modify model access</strong> (orange button)</li>
                <li>Find <strong>Anthropic</strong> section and check:
                    <ul>
                        <li>✅ Claude 3 Haiku (required - this is the default model)</li>
                        <li>✅ Claude 3.5 Sonnet (optional - can be configured in code)</li>
                    </ul>
                </li>
                <li>Click <strong>Next</strong>, then <strong>Submit</strong></li>
            </ol>

            <div class="callout">
                <span class="callout-title">⏱️ Wait Time</span>
                Model access is usually granted <strong>instantly</strong>, but can take up to 5 minutes. You'll see "Access granted" status when ready.
            </div>

            <hr>

            <h2>3. Bootstrap AWS CDK</h2>
            
            <div class="callout">
                <span class="callout-title">⚠️ Required for First-Time CDK Users</span>
                CDK Bootstrap provisions resources (S3 bucket, IAM roles) that CDK needs to deploy stacks. <strong>You must run this once per AWS account/region combination before your first CDK deployment.</strong> If you skip this step, <code>cdk deploy</code> will fail.
            </div>

            <p>Run the following command:</p>
            <pre><code>cdk bootstrap aws://ACCOUNT-ID/ap-southeast-2</code></pre>
            <p>Replace <code>ACCOUNT-ID</code> with your 12-digit AWS account ID (visible from <code>aws sts get-caller-identity</code>).</p>

            <p>Or simply run without arguments if your AWS CLI is configured correctly:</p>
            <pre><code>cdk bootstrap</code></pre>

            <p>You should see output ending with:</p>
            <pre><code>✅  Environment aws://123456789012/ap-southeast-2 bootstrapped.</code></pre>
        `,
        prev: 'prereq',
        next: 'clone'
    },
    clone: {
        title: "Module 3: Get the Code",
        html: `
            <p>Now let's download the workshop code to your computer.</p>

            <h2>1. Open Terminal</h2>
            
            <h3>On macOS:</h3>
            <p>Press <code>Cmd + Space</code>, type "Terminal", press Enter.</p>

            <h3>On Windows:</h3>
            <p>Press <code>Win + X</code>, select "Windows PowerShell" or "Terminal".</p>

            <h3>On Linux:</h3>
            <p>Press <code>Ctrl + Alt + T</code> or find Terminal in your applications.</p>

            <hr>

            <h2>2. Navigate to Your Workspace</h2>
            <p>Choose where you want to store the project:</p>

            <h3>macOS/Linux:</h3>
            <pre><code>cd ~/Documents</code></pre>

            <h3>Windows:</h3>
            <pre><code>cd $HOME\\Documents</code></pre>

            <hr>

            <h2>3. Clone the Repository</h2>
            <pre><code>git clone https://github.com/AkhileshMishra/AWS_CLINICAL_ASSISTANT_AU.git</code></pre>

            <h2>4. Enter the Project Directory</h2>
            <pre><code>cd AWS_CLINICAL_ASSISTANT_AU</code></pre>

            <h2>5. Verify the Structure</h2>
            <p>List the contents to confirm:</p>

            <h3>macOS/Linux:</h3>
            <pre><code>ls -la</code></pre>

            <h3>Windows:</h3>
            <pre><code>dir</code></pre>

            <p>You should see folders like <code>src/</code>, <code>infrastructure/</code>, <code>workshop-guide/</code>, and files like <code>package.json</code>.</p>

            <div class="callout">
                <span class="callout-title">📁 Project Structure</span>
                <pre><code>AWS_CLINICAL_ASSISTANT_AU/
├── infrastructure/    # CDK backend code
├── src/              # React frontend code
├── workshop-guide/   # This guide
├── package.json      # Frontend dependencies
└── README.md         # Project documentation</code></pre>
            </div>
        `,
        prev: 'awssetup',
        next: 'deploy'
    },
    deploy: {
        title: "Module 4: Deploy Infrastructure",
        html: `
            <p>Now we'll deploy the AWS backend infrastructure using CDK. This creates:</p>
            <ul>
                <li><strong>Amazon Cognito:</strong> User authentication (sign up/sign in)</li>
                <li><strong>Amazon S3:</strong> Storage for audio files and transcripts</li>
                <li><strong>IAM Roles:</strong> Permissions for Transcribe, Bedrock, Comprehend</li>
            </ul>

            <h2>1. Navigate to Infrastructure Folder</h2>
            <p>From the project root directory:</p>
            <pre><code>cd infrastructure</code></pre>

            <h2>2. Install CDK Dependencies</h2>
            <pre><code>npm install</code></pre>
            <p>This downloads the AWS CDK libraries. Takes about 30 seconds.</p>

            <h2>3. Deploy the Stack</h2>
            <pre><code>cdk deploy</code></pre>

            <p>You will see a security confirmation like this:</p>
            <pre><code>Do you wish to deploy these changes (y/n)?</code></pre>
            <p>Type <code>y</code> and press Enter.</p>

            <div class="callout">
                <span class="callout-title">⏱️ Deployment Time</span>
                The deployment takes <strong>3-5 minutes</strong>. You'll see progress updates in your terminal.
                <br><br>
                <strong>While you wait, click "Next" to learn about the architecture!</strong>
            </div>

            <h2>4. Save the Outputs</h2>
            <p>When deployment completes, you'll see green output like this:</p>
            <pre><code>✅  ClinicalAssistantStack

Outputs:
ClinicalAssistantStack.BucketName = clinical-assistant-123456789012-ap-southeast-2
ClinicalAssistantStack.UserPoolId = ap-southeast-2_aBcDeFgHi
ClinicalAssistantStack.UserPoolClientId = 1abc2def3ghi4jkl5mno6pqr
ClinicalAssistantStack.IdentityPoolId = ap-southeast-2:12345678-abcd-efgh-ijkl-123456789012
ClinicalAssistantStack.Region = ap-southeast-2</code></pre>

            <p><strong>⚠️ IMPORTANT:</strong> Keep this terminal open! You'll need these values in Module 6.</p>
        `,
        prev: 'clone',
        next: 'architecture'
    },
    architecture: {
        title: "Module 5: Architecture",
        html: `
            <p>While your infrastructure deploys, let's understand what you're building.</p>

            <h2>Why This Architecture?</h2>
            <p><strong>AWS HealthScribe</strong> is a powerful service for clinical documentation, but it's not available in the Sydney region. This workshop demonstrates how to build equivalent functionality using services that <em>are</em> available.</p>

            <h2>The "Adapter Pattern"</h2>
            <p>We replace HealthScribe's single API with three coordinated services:</p>

            <table style="width:100%; border-collapse: collapse; margin: 1rem 0;">
                <tr style="border-bottom: 1px solid var(--border);">
                    <th style="text-align:left; padding: 0.5rem;">HealthScribe Feature</th>
                    <th style="text-align:left; padding: 0.5rem;">Sydney Replacement</th>
                </tr>
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 0.5rem;">Audio Transcription</td>
                    <td style="padding: 0.5rem;">AWS Transcribe Medical</td>
                </tr>
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 0.5rem;">Clinical Note Generation</td>
                    <td style="padding: 0.5rem;">Amazon Bedrock (Claude 3)</td>
                </tr>
                <tr>
                    <td style="padding: 0.5rem;">Entity Extraction</td>
                    <td style="padding: 0.5rem;">Amazon Comprehend Medical</td>
                </tr>
            </table>

            <h2>Data Flow</h2>
            <pre><code>┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│  Transcribe │────▶│   Bedrock   │
│   Audio     │     │   Medical   │     │  (Claude)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ Transcript  │     │  SOAP Note  │
                    │   (JSON)    │     │   (JSON)    │
                    └─────────────┘     └─────────────┘</code></pre>

            <h2>Key Code: The Orchestrator</h2>
            <p>In <code>src/components/Conversation/Conversation.tsx</code>:</p>
            <pre><code>// Parallel execution for performance
const [summary, entities] = await Promise.all([
    generateClinicalNote(rawText),  // Bedrock
    detectEntities(rawText)         // Comprehend Medical
]);</code></pre>

            <h2>Key Code: Speaker Diarization</h2>
            <p>In <code>src/utils/HealthScribeApi/index.ts</code>:</p>
            <pre><code>Settings: {
    ShowSpeakerLabels: true,
    MaxSpeakerLabels: 2  // Doctor + Patient
}</code></pre>
            <p>This tells Transcribe to identify who is speaking (Doctor vs Patient).</p>

            <h2>Key Code: Data Mapper</h2>
            <p>The UI expects HealthScribe's JSON format. <code>src/utils/DataMapper.ts</code> converts our Transcribe/Bedrock output to match, so the UI works without modification.</p>
        `,
        prev: 'deploy',
        next: 'configure'
    },
    configure: {
        title: "Module 6: Configure App",
        html: `
            <p>Now we connect the React frontend to your deployed backend.</p>

            <h2>1. Get Your CDK Outputs</h2>
            <p>Go back to the terminal where you ran <code>cdk deploy</code>. Copy the output values:</p>
            <pre><code>ClinicalAssistantStack.BucketName = <span style="color:#fbbf24">[your-bucket-name]</span>
ClinicalAssistantStack.UserPoolId = <span style="color:#fbbf24">[your-user-pool-id]</span>
ClinicalAssistantStack.UserPoolClientId = <span style="color:#fbbf24">[your-client-id]</span>
ClinicalAssistantStack.IdentityPoolId = <span style="color:#fbbf24">[your-identity-pool-id]</span></code></pre>

            <div class="callout">
                <span class="callout-title">💡 Lost your outputs?</span>
                Run this command to see them again:
                <pre><code>aws cloudformation describe-stacks --stack-name ClinicalAssistantStack --query "Stacks[0].Outputs" --output table</code></pre>
            </div>

            <h2>2. Navigate to Project Root</h2>
            <p>If you're still in the infrastructure folder:</p>
            <pre><code>cd ..</code></pre>
            <p>You should now be in the <code>AWS_CLINICAL_ASSISTANT_AU</code> folder.</p>

            <h2>3. Create Environment File</h2>
            <p>Create a new file called <code>.env.local</code> in the project root.</p>

            <h3>macOS/Linux:</h3>
            <pre><code>touch .env.local</code></pre>

            <h3>Windows (PowerShell):</h3>
            <pre><code>New-Item .env.local -ItemType File</code></pre>

            <h2>4. Edit the File</h2>
            <p>Open <code>.env.local</code> in your text editor and add these lines, replacing the values with YOUR outputs:</p>
            <pre><code>VITE_AWS_REGION=ap-southeast-2
VITE_BUCKET_NAME=clinical-assistant-123456789012-ap-southeast-2
VITE_USER_POOL_ID=ap-southeast-2_aBcDeFgHi
VITE_USER_POOL_CLIENT_ID=1abc2def3ghi4jkl5mno6pqr
VITE_IDENTITY_POOL_ID=ap-southeast-2:12345678-abcd-efgh-ijkl-123456789012</code></pre>

            <div class="callout">
                <span class="callout-title">⚠️ Important</span>
                <ul>
                    <li>No spaces around the <code>=</code> sign</li>
                    <li>No quotes around the values</li>
                    <li>The file must be named exactly <code>.env.local</code> (with the dot)</li>
                </ul>
            </div>

            <h2>5. Save the File</h2>
            <p>Save and close your editor. The file should be in the project root alongside <code>package.json</code>.</p>
        `,
        prev: 'architecture',
        next: 'run'
    },
    run: {
        title: "Module 7: Run & Test",
        html: `
            <p>Time to launch the Clinical Assistant!</p>

            <h2>1. Install Frontend Dependencies</h2>
            <p>From the project root directory:</p>
            <pre><code>npm install</code></pre>
            <p>This downloads React and other frontend libraries. Takes 1-2 minutes.</p>

            <h2>2. Start the Development Server</h2>
            <pre><code>npm run dev</code></pre>
            <p>You should see output like:</p>
            <pre><code>  VITE v6.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/</code></pre>

            <h2>3. Open the Application</h2>
            <p>Open your web browser and go to:</p>
            <pre><code>http://localhost:5173</code></pre>

            <h2>4. Create an Account</h2>
            <ol>
                <li>Click <strong>"Create Account"</strong> or <strong>"Sign Up"</strong></li>
                <li>Enter your email address</li>
                <li>Create a password (min 8 chars, uppercase, lowercase, number)</li>
                <li>Check your email for a verification code</li>
                <li>Enter the code to verify your account</li>
                <li>Sign in with your new credentials</li>
            </ol>

            <h2>5. Test the Application</h2>
            <ol>
                <li>Click <strong>"New Conversation"</strong> (top right)</li>
                <li>Either:
                    <ul>
                        <li><strong>Upload</strong> an audio file (.wav, .mp3) of a medical conversation, OR</li>
                        <li><strong>Record</strong> a sample conversation using the microphone</li>
                    </ul>
                </li>
                <li>Enter a name for the conversation</li>
                <li>Click <strong>"Submit"</strong></li>
                <li>Wait 30-60 seconds for processing</li>
            </ol>

            <div class="callout">
                <span class="callout-title">✅ Success Criteria</span>
                You should see:
                <ul>
                    <li><strong>Left Panel:</strong> The transcript with speaker labels (Doctor/Patient)</li>
                    <li><strong>Right Panel:</strong> AI-generated SOAP note (Subjective, Objective, Assessment, Plan)</li>
                </ul>
            </div>

            <h2>6. Stop the Server</h2>
            <p>When done testing, press <code>Ctrl + C</code> in your terminal to stop the server.</p>
        `,
        prev: 'configure',
        next: 'troubleshoot'
    },
    troubleshoot: {
        title: "Module 8: Troubleshooting",
        html: `
            <h2>Common Issues & Solutions</h2>

            <h3>❌ "Access Denied" or "Not Authorized" errors</h3>
            <p><strong>Cause:</strong> Bedrock model access not enabled.</p>
            <p><strong>Fix:</strong> Go back to Module 2 and ensure you've enabled Claude model access in the Bedrock console.</p>

            <hr>

            <h3>❌ "User pool does not exist" error</h3>
            <p><strong>Cause:</strong> Wrong values in <code>.env.local</code>.</p>
            <p><strong>Fix:</strong> Double-check your CDK outputs match exactly. No extra spaces or quotes.</p>

            <hr>

            <h3>❌ CDK deploy fails with "bootstrap" error</h3>
            <p><strong>Cause:</strong> CDK not bootstrapped in this region.</p>
            <p><strong>Fix:</strong> Run:</p>
            <pre><code>cdk bootstrap</code></pre>

            <hr>

            <h3>❌ "npm: command not found"</h3>
            <p><strong>Cause:</strong> Node.js not installed or not in PATH.</p>
            <p><strong>Fix:</strong> Reinstall Node.js and restart your terminal.</p>

            <hr>

            <h3>❌ Transcript appears but no SOAP note</h3>
            <p><strong>Cause:</strong> Bedrock API error (usually permissions).</p>
            <p><strong>Fix:</strong></p>
            <ol>
                <li>Open browser Developer Tools (F12)</li>
                <li>Check the Console tab for errors</li>
                <li>Verify Bedrock model access is "Access granted" in AWS Console</li>
            </ol>

            <hr>

            <h3>❌ "CORS" errors in browser console</h3>
            <p><strong>Cause:</strong> S3 bucket CORS not configured.</p>
            <p><strong>Fix:</strong> The CDK stack should handle this. Try redeploying:</p>
            <pre><code>cd infrastructure
cdk deploy --force</code></pre>

            <hr>

            <h3>❌ Windows: "execution of scripts is disabled"</h3>
            <p><strong>Cause:</strong> PowerShell execution policy.</p>
            <p><strong>Fix:</strong> Run PowerShell as Administrator and execute:</p>
            <pre><code>Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser</code></pre>

            <hr>

            <h2>Clean Up Resources</h2>
            <p>To avoid ongoing AWS charges, delete the stack when done:</p>
            <pre><code>cd infrastructure
cdk destroy</code></pre>
            <p>Type <code>y</code> when prompted to confirm deletion.</p>

            <hr>

            <h2>Need More Help?</h2>
            <p>Check the project README or raise an issue on GitHub:</p>
            <p><a href="https://github.com/AkhileshMishra/AWS_CLINICAL_ASSISTANT_AU/issues" target="_blank">GitHub Issues</a></p>

            <div class="callout">
                <span class="callout-title">🎉 Congratulations!</span>
                You've successfully deployed a Clinical Assistant using AWS services in the Sydney region!
            </div>
        `,
        prev: 'run'
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
    window.scrollTo(0, 0);
}

window.addEventListener('hashchange', renderContent);
if (!window.location.hash) window.location.hash = '#intro';
renderContent();
