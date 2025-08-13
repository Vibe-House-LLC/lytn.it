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

// POST /api/admin/users/[id]/reset-password - Reset user password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { password, temporary = true } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Validate password strength (basic validation)
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Set new password
    const result = await cookiesClient.queries.userManagement({
      operation: 'setPassword',
      userId,
      password,
      temporary,
    });

    if (!result.data) {
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!responseData.success) {
      return NextResponse.json({ error: responseData.error || 'Failed to reset password' }, { status: 400 });
    }

    // Log the admin action
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });

    try {
      await cookiesClient.models.AdminActionLog.create({
        actionType: 'add_note',
        adminEmail: currentUser?.signInDetails?.loginId || 'unknown',
        adminUserId: currentUser?.userId || 'unknown',
        notes: `Password reset for user ${userId} (temporary: ${temporary})`,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }

    return NextResponse.json({
      success: true,
      message: temporary 
        ? 'Temporary password set successfully. User will be required to change it on next login.'
        : 'Password reset successfully.',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}