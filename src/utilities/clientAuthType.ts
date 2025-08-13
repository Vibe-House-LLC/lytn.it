import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "./amplify-utils";
import { cookies } from "next/headers";


export default async function getClientAuthType() {
    try {
        const userDetails = await runWithAmplifyServerContext({
            nextServerContext: { cookies },
            operation: (contextSpec) => getCurrentUser(contextSpec)
        });

        console.log('userDetails:', userDetails);

        return 'userPool';
    } catch (error) {
        console.error('Error getting user details:', error);
        return 'identityPool';
    }
}

export async function isUserAdmin() {
    const userDetails = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: (contextSpec) => fetchAuthSession(contextSpec)
    });

    const groups = userDetails?.tokens?.idToken?.payload?.['cognito:groups'];
    return Array.isArray(groups) && groups.includes('admins');
}