import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utilities/amplify-utils';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';

export async function GET() {
  try {
    console.log('[CHECK-USER] Starting user check...');
    
    // Get current user
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });

    // Get session with groups
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    });

    const groups = session?.tokens?.idToken?.payload?.['cognito:groups'];
    const isAdmin = Array.isArray(groups) && groups.includes('admins');

    const userInfo = {
      isLoggedIn: !!currentUser,
      userId: currentUser?.userId,
      username: currentUser?.username,
      email: currentUser?.signInDetails?.loginId,
      groups: groups || [],
      isAdmin,
      hasSession: !!session,
      hasTokens: !!session?.tokens,
      timestamp: new Date().toISOString(),
    };

    console.log('[CHECK-USER] User info:', userInfo);

    return NextResponse.json({
      success: true,
      user: userInfo,
      needsAdminGroup: !isAdmin && !!currentUser,
      instructions: !isAdmin && !!currentUser ? {
        message: "You need to be added to the 'admins' group",
        userPoolId: session?.tokens?.idToken?.payload?.aud,
        addToGroupCommand: `aws cognito-idp admin-add-user-to-group --user-pool-id ${session?.tokens?.idToken?.payload?.aud} --username "${currentUser?.signInDetails?.loginId}" --group-name admins`
      } : null
    });

  } catch (error) {
    console.error('[CHECK-USER] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      isLoggedIn: false,
    });
  }
}