// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from 'react';

import { BrowserRouter } from 'react-router-dom';

import Box from '@cloudscape-design/components/box';
import '@cloudscape-design/global-styles/index.css';

import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';

import AppSettingsContextProvider from '@/store/appSettings';
import AppThemeContextProvider from '@/store/appTheme';
import AuthContextProvider from '@/store/auth';
import NotificationsContextProvider from '@/store/notifications';

import { App } from './components';
import './index.css';
import '@aws-amplify/ui-react/styles.css';

// Configure Amplify using the environment variables from CDK
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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <Authenticator.Provider>
                <AuthContextProvider>
                    <AppThemeContextProvider>
                        <AppSettingsContextProvider>
                            <NotificationsContextProvider>
                                <App />
                                <Box>
                                    <Toaster position="bottom-left" reverseOrder={false} />
                                </Box>
                            </NotificationsContextProvider>
                        </AppSettingsContextProvider>
                    </AppThemeContextProvider>
                </AuthContextProvider>
            </Authenticator.Provider>
        </BrowserRouter>
    </React.StrictMode>
);
