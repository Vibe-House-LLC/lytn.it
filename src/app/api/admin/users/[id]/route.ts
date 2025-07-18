import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utilities/amplify-utils';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';

import { fetchAuthSession } from 'aws-amplify/auth/server';
import type { Schema } from '../../../../../../amplify/data/resource';
import outputs from '../../../../../../amplify_outputs.json';

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

// GET /api/admin/users/[id] - Get user details
export async function GET(
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

    const result = await cookiesClient.queries.userManagement({
      operation: 'getUser',
      userId,
    });

    if (!result.data) {
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }

    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!responseData.success) {
      return NextResponse.json({ error: responseData.error || 'User not found' }, { status: 404 });
    }

    // Get user groups
    const groupsResult = await cookiesClient.queries.userManagement({
      operation: 'getUserGroups',
      userId,
    });

    let groups = [];
    if (groupsResult.data) {
      const groupsData = typeof groupsResult.data === 'string' ? JSON.parse(groupsResult.data) : groupsResult.data;
      groups = groupsData.success ? groupsData.data.groups : [];
    }

    // Get user profile if exists
    let userProfile = null;
    try {
      const profileResult = await cookiesClient.models.userProfile.list({
        filter: { userId: { eq: userId } },
        limit: 1,
      });
      userProfile = profileResult.data[0] || null;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: responseData.data.user,
        groups,
        profile: userProfile,
      },
    });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { id: userId } = params;
    const body = await request.json();
    const { attributes, enabled } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update user attributes if provided
    if (attributes && Object.keys(attributes).length > 0) {
      const updateResult = await cookiesClient.queries.userManagement({
        operation: 'updateUser',
        userId,
        attributes,
      });

      if (!updateResult.data) {
        return NextResponse.json({ error: 'Failed to update user attributes' }, { status: 500 });
      }

      const updateData = typeof updateResult.data === 'string' ? JSON.parse(updateResult.data) : updateResult.data;
      if (!updateData.success) {
        return NextResponse.json({ error: updateData.error || 'Failed to update user' }, { status: 400 });
      }
    }

    // Enable/disable user if specified
    if (typeof enabled === 'boolean') {
      const operation = enabled ? 'enableUser' : 'disableUser';
      const enableResult = await cookiesClient.queries.userManagement({
        operation,
        userId,
      });

      if (!enableResult.data) {
        return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
      }

      const enableData = typeof enableResult.data === 'string' ? JSON.parse(enableResult.data) : enableResult.data;
      if (!enableData.success) {
        return NextResponse.json({ error: enableData.error || 'Failed to update user status' }, { status: 400 });
      }

      // Update user profile if exists
      try {
        const profileResult = await cookiesClient.models.userProfile.list({
          filter: { userId: { eq: userId } },
          limit: 1,
        });
        
        if (profileResult.data[0]) {
          await cookiesClient.models.userProfile.update({
            id: profileResult.data[0].id,
            isActive: enabled,
          });
        }
      } catch (error) {
        console.error('Failed to update user profile:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete user
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

    // Delete user from Cognito
    const result = await cookiesClient.queries.userManagement({
      operation: 'deleteUser',
      userId,
    });

    if (!result.data) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!responseData.success) {
      return NextResponse.json({ error: responseData.error || 'Failed to delete user' }, { status: 400 });
    }

    // Clean up user profile and related data
    try {
      // Delete user profile
      const profileResult = await cookiesClient.models.userProfile.list({
        filter: { userId: { eq: userId } },
        limit: 1,
      });
      
      if (profileResult.data[0]) {
        await cookiesClient.models.userProfile.delete({ id: profileResult.data[0].id });
      }

      // Delete user sessions
      const sessionsResult = await cookiesClient.models.userSession.list({
        filter: { userId: { eq: userId } },
      });
      
      for (const session of sessionsResult.data) {
        await cookiesClient.models.userSession.delete({ id: session.id });
      }
    } catch (error) {
      console.error('Failed to clean up user data:', error);
      // Don't fail the request if cleanup fails
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}