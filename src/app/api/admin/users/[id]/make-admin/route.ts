import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utilities/amplify-utils';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';
import { getCurrentUser } from 'aws-amplify/auth/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import type { Schema } from '../../../../../../../amplify/data/resource';
import outputs from '../../../../../../../amplify_outputs.json';

const cookiesClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
  authMode: 'userPool',
});

async function verifyAdminAccess(): Promise<boolean> {
  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => fetchAuthSession(contextSpec),
    });

    const groups = session?.tokens?.idToken?.payload?.['cognito:groups'];
    return Array.isArray(groups) && groups.includes('admins');
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
}

// POST /api/admin/users/[id]/make-admin - Promote user to admin
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { id: userId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Add user to admins group
    const result = await cookiesClient.queries.userManagement({
      operation: 'addToGroup',
      userId,
      groupName: 'admins',
    });

    if (!result.data) {
      return NextResponse.json({ error: 'Failed to promote user to admin' }, { status: 500 });
    }

    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!responseData.success) {
      return NextResponse.json({ error: responseData.error || 'Failed to promote user' }, { status: 400 });
    }

    // Log the admin action
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });

    try {
      await cookiesClient.models.adminActionLog.create({
        actionType: 'add_note',
        adminEmail: currentUser?.signInDetails?.loginId || 'unknown',
        adminUserId: currentUser?.userId || 'unknown',
        notes: `User ${userId} promoted to admin`,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'User promoted to admin successfully',
    });

  } catch (error) {
    console.error('Make admin error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]/make-admin - Remove admin privileges
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { id: userId } = params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Remove user from admins group
    const result = await cookiesClient.queries.userManagement({
      operation: 'removeFromGroup',
      userId,
      groupName: 'admins',
    });

    if (!result.data) {
      return NextResponse.json({ error: 'Failed to remove admin privileges' }, { status: 500 });
    }

    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!responseData.success) {
      return NextResponse.json({ error: responseData.error || 'Failed to remove admin privileges' }, { status: 400 });
    }

    // Log the admin action
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });

    try {
      await cookiesClient.models.adminActionLog.create({
        actionType: 'add_note',
        adminEmail: currentUser?.signInDetails?.loginId || 'unknown',
        adminUserId: currentUser?.userId || 'unknown',
        notes: `Admin privileges removed from user ${userId}`,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Admin privileges removed successfully',
    });

  } catch (error) {
    console.error('Remove admin error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}