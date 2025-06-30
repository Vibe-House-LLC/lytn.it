import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../../amplify/data/resource";
import amplifyConfig from "../../../../../amplify_outputs.json";

// Configure Amplify with the same config as the Lambda function
Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({authMode: 'identityPool'});

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
 * Check if an ID already exists
 */
async function hasConflict(id: string): Promise<boolean> {
    if (id === '') {
        return true;
    }
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


export default async function createLink(url: string, clientIp?: string) {
    try {
        console.log('Shorten handler called with event:', JSON.stringify(url, null, 2));
        
        if (!url) {
            console.error('No URL provided');
            throw new Error('URL parameter is required');
        }

        console.log('Processing URL:', url);

        const cleanedUrl = cleanUrl(url);
        console.log('Cleaned URL:', cleanedUrl);
        
        if (!meetsUrlRequirements(cleanedUrl)) {
            console.error('URL does not meet requirements:', cleanedUrl);
            throw new Error('URL does not meet requirements');
        }

        // Generate unique ID using VainID algorithm
        let generatedId: string;
        let attempts = 0;
        const maxAttempts = 10;

        console.log(`Starting ID generation with max ${maxAttempts} attempts`);
        while (true) {
            attempts++;

            generatedId = (await client.queries.vainId({}))?.data?.id || '';
            
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

        console.log('Creating database record...');
        console.log('Record data to create:', {
            id: generatedId,
            url: cleanedUrl,
            destination: cleanedUrl,
            ip: clientIp
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
}
