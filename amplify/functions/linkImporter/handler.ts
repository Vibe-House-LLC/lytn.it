import { AppSyncResolverEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

export interface ImportLinkData {
  id: string;
  destination: string;
  createdAt?: string;
  ip?: string;
  owner?: string;
  source?: string;
  status?: 'active' | 'reported' | 'inactive';
}

export interface ImportLinksInput {
  operation: 'validateImport' | 'importLinks' | 'getImportStatus';
  links?: ImportLinkData[];
  importId?: string;
  batchSize?: number;
  dryRun?: boolean;
}

export interface ImportLinksOutput {
  success: boolean;
  data?: any;
  error?: string;
  importId?: string;
  stats?: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  validationErrors?: Array<{
    index: number;
    field: string;
    message: string;
    link: ImportLinkData;
  }>;
}

const BATCH_SIZE = 25; // DynamoDB batch write limit

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

// Get table name from environment (set by Amplify)
const SHORTENED_URL_TABLE = process.env.AMPLIFY_DATA_SHORTENEDURL_TABLE_NAME;

export const handler = async (
  event: AppSyncResolverEvent<ImportLinksInput>
): Promise<ImportLinksOutput> => {
  console.log('[LinkImporter] Handler called with event:', JSON.stringify(event, null, 2));
  
  const { operation, links, importId, batchSize = BATCH_SIZE, dryRun = false } = event.arguments;
  
  // Extract current user info from GraphQL context
  const currentUser = event.identity?.claims?.username || event.identity?.username;
  console.log('[LinkImporter] Current user:', currentUser);
  
  try {
    switch (operation) {
      case 'validateImport':
        if (!links || !Array.isArray(links)) {
          return { success: false, error: 'Links array is required for validation' };
        }
        return await validateImport(links, currentUser);
      
      case 'importLinks':
        if (!links || !Array.isArray(links)) {
          return { success: false, error: 'Links array is required for import' };
        }
        return await importLinks(links, batchSize, dryRun, currentUser);
      
      case 'getImportStatus':
        if (!importId) {
          return { success: false, error: 'Import ID is required' };
        }
        return await getImportStatus(importId);
      
      default:
        return { success: false, error: `Invalid operation: ${operation}` };
    }
  } catch (error) {
    console.error('[LinkImporter] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

async function validateImport(links: ImportLinkData[], currentUser?: string): Promise<ImportLinksOutput> {
  console.log(`[LinkImporter] Validating ${links.length} links`);
  
  const validationErrors: Array<{
    index: number;
    field: string;
    message: string;
    link: ImportLinkData;
  }> = [];
  
  const seenIds = new Set<string>();
  
  links.forEach((link, index) => {
    // Validate required fields
    if (!link.id) {
      validationErrors.push({
        index,
        field: 'id',
        message: 'ID is required',
        link
      });
    } else if (!/^[a-zA-Z0-9_-]+$/.test(link.id)) {
      validationErrors.push({
        index,
        field: 'id',
        message: 'ID must contain only alphanumeric characters, hyphens, and underscores',
        link
      });
    } else if (seenIds.has(link.id)) {
      validationErrors.push({
        index,
        field: 'id',
        message: 'Duplicate ID found in import data',
        link
      });
    } else {
      seenIds.add(link.id);
    }
    
    if (!link.destination) {
      validationErrors.push({
        index,
        field: 'destination',
        message: 'Destination URL is required',
        link
      });
    } else {
      try {
        new URL(link.destination);
      } catch {
        validationErrors.push({
          index,
          field: 'destination',
          message: 'Invalid destination URL format',
          link
        });
      }
    }
    
    // Validate optional fields
    if (link.createdAt) {
      const date = new Date(link.createdAt);
      if (isNaN(date.getTime())) {
        validationErrors.push({
          index,
          field: 'createdAt',
          message: 'Invalid date format for createdAt',
          link
        });
      }
    }
    
    if (link.status && !['active', 'reported', 'inactive'].includes(link.status)) {
      validationErrors.push({
        index,
        field: 'status',
        message: 'Status must be one of: active, reported, inactive',
        link
      });
    }
    
    if (link.source && !['upload', 'manual', 'api', 'import'].includes(link.source)) {
      validationErrors.push({
        index,
        field: 'source',
        message: 'Source must be one of: upload, manual, api, import',
        link
      });
    }
    
    if (link.ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(link.ip)) {
      validationErrors.push({
        index,
        field: 'ip',
        message: 'Invalid IP address format',
        link
      });
    }
  });
  
  console.log(`[LinkImporter] Validation complete. ${validationErrors.length} errors found`);
  
  return {
    success: validationErrors.length === 0,
    data: {
      isValid: validationErrors.length === 0,
      totalLinks: links.length,
      validLinks: links.length - validationErrors.length,
      errorCount: validationErrors.length
    },
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined
  };
}

async function importLinks(
  links: ImportLinkData[], 
  batchSize: number, 
  dryRun: boolean,
  currentUser?: string
): Promise<ImportLinksOutput> {
  console.log(`[LinkImporter] Starting import of ${links.length} links (dryRun: ${dryRun})`);
  
  const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let processed = 0;
  let successful = 0;
  let failed = 0;
  let skipped = 0;
  
  // First validate all links
  const validation = await validateImport(links, currentUser);
  if (!validation.success || validation.validationErrors) {
    return {
      success: false,
      error: 'Import failed validation',
      validationErrors: validation.validationErrors,
      importId
    };
  }
  
  if (dryRun) {
    console.log('[LinkImporter] Dry run complete - no actual import performed');
    return {
      success: true,
      data: {
        dryRun: true,
        wouldImport: links.length
      },
      importId,
      stats: {
        total: links.length,
        processed: links.length,
        successful: links.length,
        failed: 0,
        skipped: 0
      }
    };
  }
  
  // Process in batches
  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize);
    console.log(`[LinkImporter] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`);
    
    try {
      for (const link of batch) {
        try {
          await createShortenedUrl(link, currentUser);
          successful++;
        } catch (error: any) {
          console.error(`[LinkImporter] Failed to create link ${link.id}:`, error);
          if (error.message?.includes('already exists')) {
            skipped++;
          } else {
            failed++;
          }
        }
        processed++;
      }
    } catch (error) {
      console.error(`[LinkImporter] Batch processing error:`, error);
      failed += batch.length;
      processed += batch.length;
    }
  }
  
  console.log(`[LinkImporter] Import complete. Processed: ${processed}, Successful: ${successful}, Failed: ${failed}`);
  
  return {
    success: failed === 0,
    data: {
      importCompleted: true,
      message: failed === 0 ? 'All links imported successfully' : `${successful} links imported, ${failed} failed`
    },
    importId,
    stats: {
      total: links.length,
      processed,
      successful,
      failed,
      skipped
    }
  };
}

async function createShortenedUrl(link: ImportLinkData, currentUser?: string): Promise<void> {
  console.log(`[LinkImporter] Creating link: ${link.id} -> ${link.destination}`);
  
  if (!SHORTENED_URL_TABLE) {
    throw new Error('SHORTENED_URL_TABLE environment variable not set');
  }
  
  const now = new Date().toISOString();
  
  const item = {
    id: link.id,
    destination: link.destination,
    createdAt: link.createdAt || now,
    updatedAt: now,
    ip: link.ip || '0.0.0.0', // Default IP if not provided
    source: link.source || 'upload', // Default to 'upload' for imported links
    status: link.status || 'active',
    owner: link.owner || currentUser || undefined, // Use current user as owner if not specified
    // Initialize optional fields
    deletedAt: undefined,
    deletedReason: undefined,
  };
  
  const command = new PutCommand({
    TableName: SHORTENED_URL_TABLE,
    Item: item,
    // Prevent overwriting existing items
    ConditionExpression: 'attribute_not_exists(id)'
  });
  
  try {
    await dynamoDocClient.send(command);
    console.log(`[LinkImporter] Successfully created link: ${link.id}`);
  } catch (error: any) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.warn(`[LinkImporter] Link ${link.id} already exists, skipping`);
      throw new Error(`Link with ID ${link.id} already exists`);
    }
    console.error(`[LinkImporter] Failed to create link ${link.id}:`, error);
    throw error;
  }
}

async function getImportStatus(importId: string): Promise<ImportLinksOutput> {
  console.log(`[LinkImporter] Getting status for import: ${importId}`);
  
  // This is a placeholder - in a real implementation, you would
  // store import status in a database and retrieve it here
  return {
    success: true,
    data: {
      importId,
      status: 'completed',
      message: 'Import status retrieval not yet implemented'
    }
  };
}