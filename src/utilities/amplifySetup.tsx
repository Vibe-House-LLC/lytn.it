'use client';

import outputs from '../../amplify_outputs.json';
import { Amplify } from 'aws-amplify';

Amplify.configure(outputs);

export default function AmplifySetup({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    );
}
