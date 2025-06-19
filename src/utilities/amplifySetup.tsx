'use client';

import outputs from '../../amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';

Amplify.configure(outputs, {ssr:true});

export default function AmplifySetup({ children }: { children: React.ReactNode }) {
    return (
        <Authenticator.Provider>
            {children}
        </Authenticator.Provider>
    );
}
