import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Authenticator } from '@aws-amplify/ui-react'
import App from './components/App/App'
import './index.css'
import { Amplify } from 'aws-amplify'
import AuthContextProvider from './store/auth'
import NotificationsContextProvider from './store/notifications'

import '@aws-amplify/ui-react/styles.css'

// FIX: Manually configure Amplify using the environment variables from CDK
const authConfig = {
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
};

Amplify.configure(authConfig);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Authenticator.Provider>
      <BrowserRouter>
        <NotificationsContextProvider>
          <AuthContextProvider>
            <App />
          </AuthContextProvider>
        </NotificationsContextProvider>
      </BrowserRouter>
    </Authenticator.Provider>
  </React.StrictMode>,
)
