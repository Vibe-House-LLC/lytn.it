'use client';

import outputs from '../../amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CookieStorage } from 'aws-amplify/utils';

Amplify.configure(outputs, { ssr: true });

// 2️⃣  Tell Amplify to use a cookie that also works on http://localhost
cognitoUserPoolsTokenProvider.setKeyValueStorage(
    new CookieStorage({
      // secure cookies only when we’re actually on https
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',          // lax is usually what you want for SSR
      path: '/',               // root path
    })
  );

  console.log(process.env.NODE_ENV);

export default function AmplifySetup({ children }: { children: React.ReactNode }) {
    return (
        <Authenticator.Provider>
            {children}
        </Authenticator.Provider>
    );
}
