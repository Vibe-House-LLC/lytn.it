import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utilities/amplify-utils';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import type { Schema } from '../../../../../amplify/data/resource';
import outputs from '../../../../../amplify_outputs.json';
import { logAdminAction } from '@/lib/audit-logger';

const cookiesClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
  authMode: 'userPool',
});

async function verifyAdminAccess(): Promise<boolean> {
  try {
    console.log('[API:Auth] Starting admin verification...');
    
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    });
    
    console.log('[API:Auth] Session obtained:', {
      hasSession: !!session,
      hasTokens: !!session?.tokens,
      hasIdToken: !!session?.tokens?.idToken,
      hasPayload: !!session?.tokens?.idToken?.payload
    });

    const groups = session?.tokens?.idToken?.payload?.['cognito:groups'];
    console.log('[API:Auth] Groups from token:', groups);
    console.log('[API:Auth] Groups type:', typeof groups);
    console.log('[API:Auth] Is array:', Array.isArray(groups));
    
    const isAdmin = Array.isArray(groups) && groups.includes('admins');
    console.log('[API:Auth] Is admin result:', isAdmin);
    
    return isAdmin;
  } catch (error) {
    console.error('[API:Auth] Admin verification error:', error);
    console.error('[API:Auth] Error type:', typeof error);
    console.error('[API:Auth] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[API:Auth] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return false;
  }
}

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    console.log('[API:Users] GET request started');
    console.log('[API:Users] Request URL:', request.url);
    console.log('[API:Users] Request headers:', Object.fromEntries(request.headers.entries()));

    console.log('[API:Users] Verifying admin access...');
    const isAdmin = await verifyAdminAccess();
    console.log('[API:Users] Admin access verified:', isAdmin);
    
    if (!isAdmin) {
      console.log('[API:Users] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const nextToken = searchParams.get('nextToken') || undefined;
    const filter = searchParams.get('filter') || undefined;

    console.log('[API:Users] Query params:', { limit, nextToken, filter });

    console.log('[API:Users] Getting current user...');
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });
    console.log('[API:Users] Current user:', {
      userId: currentUser?.userId,
      email: currentUser?.signInDetails?.loginId,
      username: currentUser?.username
    });

    console.log('[API:Users] Calling userManagement Lambda...');
    const result = await cookiesClient.queries.userManagement({
      operation: 'listUsers',
      limit,
      nextToken,
      filter,
    });
    console.log('[API:Users] Lambda result:', {
      hasData: !!result.data,
      dataType: typeof result.data,
      errors: result.errors
    });

    if (!result.data) {
      console.error('[API:Users] No data returned from Lambda');
      console.error('[API:Users] Full result:', result);
      
      await logAdminAction({
        action: 'listUsers',
        adminEmail: currentUser?.signInDetails?.loginId || 'unknown',
        adminUserId: currentUser?.userId || 'unknown',
        request,
        success: false,
        errorMessage: 'Failed to fetch users - no data returned',
      });
      return NextResponse.json({ 
        error: 'Failed to fetch users', 
        details: 'No data returned from user management service',
        lambdaErrors: result.errors 
      }, { status: 500 });
    }

    console.log('[API:Users] Parsing Lambda response...');
    console.log('[API:Users] Raw Lambda result.data:', result.data);
    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
    console.log('[API:Users] Parsed response data:', responseData);
    console.log('[API:Users] Response structure check:', {
      success: responseData.success,
      hasData: !!responseData.data,
      dataKeys: responseData.data ? Object.keys(responseData.data) : 'no data',
      userCount: responseData.data?.users?.length || 0,
      fullResponseData: responseData
    });

    if (!responseData.success) {
      console.error('[API:Users] Lambda returned error:', responseData.error);
      return NextResponse.json({ 
        error: responseData.error || 'User management operation failed',
        lambdaResponse: responseData
      }, { status: 500 });
    }
    
    await logAdminAction({
      action: 'listUsers',
      adminEmail: currentUser?.signInDetails?.loginId || 'unknown',
      adminUserId: currentUser?.userId || 'unknown',
      request,
      success: true,
      additionalData: { count: responseData.data?.users?.length || 0 },
    });
    
    // Handle case where Lambda returns success but no data structure
    if (!responseData.data) {
      console.log('[API:Users] Lambda returned success but no data - might be environment issue');
      return NextResponse.json({
        success: true,
        data: {
          users: [],
          count: 0,
        },
        nextToken: undefined,
        warning: 'No users returned from Cognito - check environment configuration',
        lambdaResponse: responseData
      });
    }

    return NextResponse.json({
      success: true,
      data: responseData.data,
      nextToken: responseData.nextToken,
    });

  } catch (error) {
    console.error('[API:Users] Caught error in GET handler:', error);
    console.error('[API:Users] Error type:', typeof error);
    console.error('[API:Users] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[API:Users] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[API:Users] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Check if it's an auth-related error
    if (error instanceof Error && error.message.includes('auth')) {
      console.error('[API:Users] Authentication error detected');
    }
    
    // Check if it's a Lambda/AWS error
    if (error instanceof Error && error.message.includes('Lambda')) {
      console.error('[API:Users] Lambda execution error detected');
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.name : typeof error,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, temporary = true, attributes = {} } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get current admin user for audit trail
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });

    const result = await cookiesClient.queries.userManagement({
      operation: 'createUser',
      email,
      password,
      temporary,
      attributes,
    });

    if (!result.data) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!responseData.success) {
      await logAdminAction({
        action: 'createUser',
        adminEmail: currentUser?.signInDetails?.loginId || 'unknown',
        adminUserId: currentUser?.userId || 'unknown',
        targetEmail: email,
        request,
        success: false,
        errorMessage: responseData.error || 'Failed to create user',
      });
      return NextResponse.json({ error: responseData.error || 'Failed to create user' }, { status: 400 });
    }

    // Create user profile record for tracking
    try {
      await cookiesClient.models.userProfile.create({
        userId: email,
        email,
        displayName: attributes.name || email,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.username || 'unknown',
        linksCreated: 0,
        reportsSubmitted: 0,
      });
    } catch (profileError) {
      console.error('Failed to create user profile:', profileError);
      // Don't fail the request if profile creation fails
    }

    await logAdminAction({
      action: 'createUser',
      adminEmail: currentUser?.signInDetails?.loginId || 'unknown',
      adminUserId: currentUser?.userId || 'unknown',
      targetEmail: email,
      request,
      success: true,
      additionalData: { temporary, hasCustomPassword: !!password },
    });

    return NextResponse.json({
      success: true,
      data: responseData.data,
      message: 'User created successfully',
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}