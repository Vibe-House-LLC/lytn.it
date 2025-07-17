import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utilities/amplify-utils';
import { fetchAuthSession } from 'aws-amplify/auth/server';

async function verifyAdminAccess(): Promise<boolean> {
  try {
    console.log('[API:UsersFallback] Starting admin verification...');
    
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    });
    
    console.log('[API:UsersFallback] Session obtained:', {
      hasSession: !!session,
      hasTokens: !!session?.tokens,
      hasIdToken: !!session?.tokens?.idToken,
      hasPayload: !!session?.tokens?.idToken?.payload
    });

    const groups = session?.tokens?.idToken?.payload?.['cognito:groups'];
    console.log('[API:UsersFallback] Groups from token:', groups);
    
    const isAdmin = Array.isArray(groups) && groups.includes('admins');
    console.log('[API:UsersFallback] Is admin result:', isAdmin);
    
    return isAdmin;
  } catch (error) {
    console.error('[API:UsersFallback] Admin verification error:', error);
    return false;
  }
}

// GET /api/admin/users-fallback - Mock users list for testing
export async function GET(request: NextRequest) {
  try {
    console.log('[API:UsersFallback] GET request started');
    
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      console.log('[API:UsersFallback] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Mock data for testing
    const mockUsers = [
      {
        username: 'admin@example.com',
        email: 'admin@example.com',
        emailVerified: true,
        status: 'CONFIRMED',
        enabled: true,
        createdDate: new Date().toISOString(),
        lastModifiedDate: new Date().toISOString(),
        attributes: [
          { Name: 'email', Value: 'admin@example.com' },
          { Name: 'email_verified', Value: 'true' }
        ]
      },
      {
        username: 'user@example.com',
        email: 'user@example.com',
        emailVerified: true,
        status: 'CONFIRMED',
        enabled: true,
        createdDate: new Date(Date.now() - 86400000).toISOString(),
        lastModifiedDate: new Date(Date.now() - 86400000).toISOString(),
        attributes: [
          { Name: 'email', Value: 'user@example.com' },
          { Name: 'email_verified', Value: 'true' }
        ]
      }
    ];

    // Add mock groups
    const usersWithGroups = mockUsers.map(user => ({
      ...user,
      groups: user.email === 'admin@example.com' ? ['admins'] : [],
    }));

    console.log('[API:UsersFallback] Returning mock users:', usersWithGroups.length);

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithGroups,
        count: usersWithGroups.length,
      },
      nextToken: undefined,
    });

  } catch (error) {
    console.error('[API:UsersFallback] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.name : typeof error,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}