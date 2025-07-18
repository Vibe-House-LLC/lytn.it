import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utilities/amplify-utils';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/api';

import { fetchAuthSession } from 'aws-amplify/auth/server';
import type { Schema } from '../../../../../amplify/data/resource';
import outputs from '../../../../../amplify_outputs.json';

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

// POST /api/admin/import - Import links
export async function POST(request: NextRequest) {
  try {
    console.log('[API:Import] POST request started');
    
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { operation, links, importId, batchSize, dryRun } = body;

    if (!operation) {
      return NextResponse.json({ error: 'Operation is required' }, { status: 400 });
    }

    console.log('[API:Import] Calling linkImporter Lambda with operation:', operation);
    
    const result = await cookiesClient.queries.linkImporter({
      operation,
      links: links ? JSON.stringify(links) : undefined,
      importId,
      batchSize,
      dryRun
    });

    if (!result.data) {
      console.error('[API:Import] No data returned from Lambda');
      return NextResponse.json({ 
        error: 'Failed to process import request',
        details: 'No data returned from import service'
      }, { status: 500 });
    }

    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    if (!responseData.success) {
      return NextResponse.json({ 
        error: responseData.error || 'Import operation failed',
        validationErrors: responseData.validationErrors,
        importResponse: responseData
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: responseData.data,
      importId: responseData.importId,
      stats: responseData.stats,
      validationErrors: responseData.validationErrors
    });

  } catch (error) {
    console.error('[API:Import] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/admin/import?importId=xxx - Get import status
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const importId = searchParams.get('importId');

    if (!importId) {
      return NextResponse.json({ error: 'Import ID is required' }, { status: 400 });
    }

    const result = await cookiesClient.queries.linkImporter({
      operation: 'getImportStatus',
      importId
    });

    if (!result.data) {
      return NextResponse.json({ 
        error: 'Failed to get import status' 
      }, { status: 500 });
    }

    const responseData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

    return NextResponse.json({
      success: true,
      data: responseData.data
    });

  } catch (error) {
    console.error('[API:Import] Status check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}