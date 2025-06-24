import type { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../data/resource';
import { generateId } from './vainId';
// @ts-ignore
import amplifyConfig from './amplify_outputs.json';

// Configure Amplify with the same configuration as the frontend
Amplify.configure(amplifyConfig);

const client = generateClient<Schema>();
const SEED = 'lytnit';

/**
 * Check if a URL meets basic requirements
 */
function meetsUrlRequirements(url: string): boolean {
    try {
        const parsed = new URL(url);
        return !!(parsed.protocol && parsed.hostname && parsed.hostname.includes('.'));
    } catch {
        return false;
    }
}

/**
 * Clean and validate URL
 */
function cleanUrl(url: string): string {
    if (!meetsUrlRequirements(url)) {
        const withProtocol = `http://${url}`;
        if (meetsUrlRequirements(withProtocol)) {
            return withProtocol;
        }
    }
    return url;
}

/**
 * Get next iteration number
 */
async function getIteration(): Promise<number> {
    try {
        // Try to find existing iterator by seed
        const existing = await client.models.iterator.list({
            filter: { seed: { eq: SEED } }
        });
        
        if (existing.data && existing.data.length > 0) {
            // Update existing iterator
            const currentIterator = existing.data[0];
            const updated = await client.models.iterator.update({
                id: currentIterator.id,
                seed: SEED,
                iteration: (currentIterator.iteration || 0) + 1
            });
            return updated.data?.iteration || 1;
        } else {
            // Create new iterator
            const created = await client.models.iterator.create({
                seed: SEED,
                iteration: 1
            });
            return created.data?.iteration || 1;
        }
    } catch (error) {
        console.error('Error managing iteration:', error);
        return Date.now() % 10000; // Fallback to timestamp-based
    }
}

/**
 * Check if an ID already exists
 */
async function hasConflict(id: string): Promise<boolean> {
    try {
        const result = await client.models.shortenedUrl.get({ id });
        return !!result.data;
    } catch {
        return false;
    }
}

export const handler: Handler = async (event, context) => {
    try {
        console.log('Shorten handler called with event:', JSON.stringify(event, null, 2));
        
        const { url } = event.arguments;
        
        if (!url) {
            console.error('No URL provided');
            return 'Error: URL parameter is required';
        }

        console.log('Processing URL:', url);

        const cleanedUrl = cleanUrl(url);
        console.log('Cleaned URL:', cleanedUrl);
        
        if (!meetsUrlRequirements(cleanedUrl)) {
            console.error('URL does not meet requirements:', cleanedUrl);
            return 'Error: The link seems to be invalid...';
        }

        // Generate unique ID using VainID algorithm
        let generatedId: string;
        let attempts = 0;
        const maxAttempts = 10;

        while (true) {
            const iteration = await getIteration();
            console.log('Got iteration:', iteration);
            
            generatedId = generateId(iteration, SEED);
            console.log('Generated ID:', generatedId);
            
            if (!(await hasConflict(generatedId))) {
                console.log(`No conflict with ${generatedId}`);
                break;
            } else {
                console.log(`Conflict with ${generatedId}, generating a new one.`);
                attempts++;
                
                if (attempts >= maxAttempts) {
                    throw new Error('Unable to generate unique ID after maximum attempts');
                }
            }
        }

        console.log('Final unique ID:', generatedId);

        // Get client IP
        const clientIp = event.requestContext?.http?.sourceIp || 
                        event.headers?.['x-forwarded-for'] || 
                        'unknown';

        console.log('Creating database record...');
        
        // Create shortened URL record
        const newRecord = await client.models.shortenedUrl.create({
            id: generatedId,
            url: cleanedUrl,
            destination: cleanedUrl,
            ip: clientIp,
            createdAt: new Date().toISOString()
        });

        console.log('Database record created:', newRecord);

        if (newRecord.data) {
            const result = generatedId;
            console.log('Returning result:', result);
            return result;
        } else {
            throw new Error('Failed to create shortened URL record');
        }

    } catch (error) {
        console.error('Error in shorten handler:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return `Error: ${error instanceof Error ? error.message : 'Internal server error'}`;
    }
};
