import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../../amplify/data/resource";
import amplifyConfig from "../../../../../amplify_outputs.json";

// Configure Amplify with the same config as the Lambda function
Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({authMode: 'identityPool'});

/**
 * Validate and clean IP address for schema validation
 */
function validateIpAddress(ip?: string): string | undefined {
    if (!ip) return undefined;
    
    // Handle common localhost addresses
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        return '127.0.0.1';
    }
    
    // Basic IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
        return ip;
    }
    
    // Basic IPv6 validation (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
        return ip;
    }
    
    // If IP is invalid, return undefined instead of failing
    console.log(`Invalid IP address format: ${ip}, skipping IP field`);
    return undefined;
}

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
 * Validate email format
 */
function validateEmail(email?: string): string | undefined {
    if (!email) return undefined;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
        return email;
    }
    
    console.log(`Invalid email format: ${email}, skipping owner field`);
    return undefined;
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


interface CreateLinkParams {
    url: string;
    clientIp?: string;
    source?: 'user_created' | 'imported' | 'admin_created' | 'api_created' | 'bulk_import';
    owner?: string;
    userEmail?: string; // Add userEmail for tracking authenticated users
}

export default async function createLink({ url, clientIp, source = 'user_created', owner, userEmail }: CreateLinkParams): Promise<string> {
    try {
        console.log('Shorten handler called with event:', JSON.stringify(url, null, 2));
        
        if (!url) {
            console.error('No URL provided');
            throw new Error('URL parameter is required');
        }

        console.log('Processing URL:', url);
        console.log('User Email:', userEmail);
        console.log('Client IP:', clientIp);

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

        // Validate optional fields
        const validatedIp = validateIpAddress(clientIp);
        
        // For authenticated users, prefer userEmail, fallback to owner
        // For guests, owner will be undefined anyway
        const emailToUse = userEmail || owner;
        const validatedOwner = validateEmail(emailToUse);

        // Log tracking info for debugging
        if (userEmail) {
            console.log(`Authenticated user: ${userEmail}, IP: ${validatedIp || 'invalid'}`);
        } else {
            console.log(`Guest user, IP: ${validatedIp || 'invalid'}`);
        }

        // Prepare record data - only include fields that pass validation
        const recordData = {
            id: generatedId,
            destination: cleanedUrl,
            createdAt: new Date().toISOString(),
            source,
        } as {
            id: string;
            destination: string;
            createdAt: string;
            source: 'user_created' | 'imported' | 'admin_created' | 'api_created' | 'bulk_import';
            ip?: string;
            owner?: string;
        };

        // Always try to add IP if available (for both guests and authenticated users)
        if (validatedIp) {
            recordData.ip = validatedIp;
        }
        
        // Add owner email for authenticated users
        if (validatedOwner) {
            recordData.owner = validatedOwner;
        }

        console.log('Creating database record...');
        console.log('Record data to create:', recordData);
        
        // Create shortened URL record
        const newRecord = await client.models.shortenedUrl.create(recordData);

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
