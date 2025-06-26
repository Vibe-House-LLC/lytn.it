import type { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../data/resource';
import { generateId } from './vainId';
// @ts-ignore
import amplifyConfig from '../../../amplify_outputs.json';

// Configure Amplify with the config file
Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({
  authMode: 'apiKey'
});

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
        console.log('Getting iteration for seed:', SEED);
        
        // Try to find existing iterator by seed
        const existing = await client.models.iterator.list({
            filter: { seed: { eq: SEED } }
        });
        
        console.log('Existing iterators found:', existing.data?.length || 0);
        console.log('Existing iterator data:', JSON.stringify(existing.data, null, 2));
        
        if (existing.data && existing.data.length > 0) {
            // Update existing iterator
            const currentIterator = existing.data[0];
            console.log('Current iterator:', currentIterator);
            
            const newIteration = (currentIterator.iteration || 0) + 1;
            console.log('Updating iterator to iteration:', newIteration);
            
            const updated = await client.models.iterator.update({
                id: currentIterator.id,
                seed: SEED,
                iteration: newIteration
            });
            
            console.log('Updated iterator result:', JSON.stringify(updated, null, 2));
            return updated.data?.iteration || 1;
        } else {
            // Create new iterator
            console.log('Creating new iterator with iteration 1');
            const created = await client.models.iterator.create({
                seed: SEED,
                iteration: 1
            });
            
            console.log('Created iterator result:', JSON.stringify(created, null, 2));
            return created.data?.iteration || 1;
        }
    } catch (error) {
        console.error('Error managing iteration:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Use a more random fallback
        const fallback = Math.floor(Math.random() * 1000) + Date.now() % 10000;
        console.log('Using fallback iteration:', fallback);
        return fallback;
    }
}

/**
 * Check if an ID already exists
 */
async function hasConflict(id: string): Promise<boolean> {
    try {
        const result = await client.models.shortenedUrl.get({ id });
        const hasConflict = !!result.data;
        console.log(`Conflict check for ID "${id}": ${hasConflict ? 'CONFLICT' : 'NO CONFLICT'}`);
        if (hasConflict) {
            console.log(`Existing record:`, result.data);
        }
        return hasConflict;
    } catch (error) {
        console.log(`Conflict check for ID "${id}": NO CONFLICT (error: ${error})`);
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

        console.log(`Starting ID generation with max ${maxAttempts} attempts`);
        while (true) {
            attempts++;
            console.log(`Attempt ${attempts}/${maxAttempts}`);
            
            const iteration = await getIteration();
            console.log('Got iteration:', iteration);
            
            generatedId = generateId(iteration, SEED);
            console.log('Generated ID:', generatedId);
            
            const conflict = await hasConflict(generatedId);
            if (!conflict) {
                console.log(`SUCCESS: No conflict with ${generatedId} after ${attempts} attempts`);
                break;
            } else {
                console.log(`CONFLICT: ${generatedId} already exists, trying again...`);
                
                if (attempts >= maxAttempts) {
                    console.error(`FAILED: Unable to generate unique ID after ${maxAttempts} attempts`);
                    throw new Error(`Unable to generate unique ID after maximum attempts (${maxAttempts})`);
                }
            }
        }

        console.log('Final unique ID:', generatedId);

        // Get client IP
        const clientIp = event.requestContext?.http?.sourceIp || 
                        event.headers?.['x-forwarded-for'] || 
                        'unknown';

        console.log('Creating database record...');
        console.log('Record data to create:', {
            id: generatedId,
            url: cleanedUrl,
            destination: cleanedUrl,
            ip: clientIp,
            createdAt: new Date().toISOString()
        });
        
        // Create shortened URL record
        const newRecord = await client.models.shortenedUrl.create({
            id: generatedId,
            url: cleanedUrl,
            destination: cleanedUrl,
            ip: clientIp,
            createdAt: new Date().toISOString()
        });

        console.log('Database record created:', JSON.stringify(newRecord, null, 2));
        console.log('newRecord.data:', newRecord.data);
        console.log('newRecord.errors:', newRecord.errors);

        if (newRecord.data) {
            const result = generatedId;
            console.log('Returning result:', result);
            return result;
        } else {
            console.error('Failed to create record - no data returned');
            console.error('Full response:', JSON.stringify(newRecord, null, 2));
            throw new Error('Failed to create shortened URL record');
        }

    } catch (error) {
        console.error('Error in shorten handler:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return `Error: ${error instanceof Error ? error.message : 'Internal server error'}`;
    }
};
