import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App/App'
import { Amplify } from 'aws-amplify'

// Manually configure Amplify using environment variables from CDK
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
      allowGuestAccess: false
    }
  },
  Storage: {
    S3: {
      bucket: import.meta.env.VITE_BUCKET_NAME,
      region: import.meta.env.VITE_AWS_REGION,
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
