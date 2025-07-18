import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utilities/amplify-utils';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import type { Schema } from '../../../../../amplify/data/resource';
import outputs from '../../../../../amplify_outputs.json';

const cookiesClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
  authMode: 'userPool',
});

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Starting debug endpoint');
    
    const debugInfo: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      cookies: request.cookies.getAll(),
    };

    // Test 1: Check if we can get current user
    try {
      console.log('[DEBUG] Testing getCurrentUser...');
      const currentUser = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: (contextSpec) => getCurrentUser(contextSpec),
      });
      
      debugInfo.currentUser = {
        exists: !!currentUser,
        userId: currentUser?.userId,
        username: currentUser?.username,
        email: currentUser?.signInDetails?.loginId,
      };
      console.log('[DEBUG] Current user result:', debugInfo.currentUser);
    } catch (error) {
      console.error('[DEBUG] getCurrentUser error:', error);
      debugInfo.currentUserError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      };
    }

    // Test 2: Check auth session
    try {
      console.log('[DEBUG] Testing fetchAuthSession...');
      const session = await runWithAmplifyServerContext({
        nextServerContext: { cookies },
        operation: (contextSpec) => fetchAuthSession(contextSpec),
      });

      debugInfo.session = {
        exists: !!session,
        hasTokens: !!session?.tokens,
        hasIdToken: !!session?.tokens?.idToken,
        hasPayload: !!session?.tokens?.idToken?.payload,
        groups: session?.tokens?.idToken?.payload?.['cognito:groups'],
        credentials: !!session?.credentials,
        identityId: session?.identityId,
      };
      console.log('[DEBUG] Session result:', debugInfo.session);
    } catch (error) {
      console.error('[DEBUG] fetchAuthSession error:', error);
      debugInfo.sessionError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      };
    }

    // Test 3: Test basic client query (not user management)
    try {
      console.log('[DEBUG] Testing basic query...');
      const basicQuery = await cookiesClient.queries.vainId({});
      debugInfo.basicQuery = {
        success: !!basicQuery.data,
        hasData: !!basicQuery.data,
        errors: basicQuery.errors,
      };
      console.log('[DEBUG] Basic query result:', debugInfo.basicQuery);
    } catch (error) {
      console.error('[DEBUG] Basic query error:', error);
      debugInfo.basicQueryError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      };
    }

    // Test 4: Test userManagement query
    try {
      console.log('[DEBUG] Testing userManagement query...');
      const userMgmtQuery = await cookiesClient.queries.userManagement({
        operation: 'listUsers',
        limit: 5,
      });
      debugInfo.userManagementQuery = {
        success: !!userMgmtQuery.data,
        hasData: !!userMgmtQuery.data,
        dataType: typeof userMgmtQuery.data,
        errors: userMgmtQuery.errors,
        rawData: userMgmtQuery.data,
      };
      console.log('[DEBUG] User management query result:', debugInfo.userManagementQuery);
    } catch (error) {
      console.error('[DEBUG] User management query error:', error);
      debugInfo.userManagementQueryError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
      };
    }

    // Test 5: Environment check
    debugInfo.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasAmplifyConfig: !!outputs,
      amplifyConfigKeys: outputs ? Object.keys(outputs) : [],
      hasUserPoolId: !!process.env.AMPLIFY_AUTH_USERPOOL_ID,
      hasAwsRegion: !!process.env.AWS_REGION,
    };

    console.log('[DEBUG] Debug info complete:', debugInfo);

    return NextResponse.json({
      success: true,
      debug: debugInfo,
    });

  } catch (error) {
    console.error('[DEBUG] Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack',
        type: typeof error,
      },
    }, { status: 500 });
  }
}