import type { Handler } from 'aws-lambda';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import * as aws4 from 'aws4';
import { generateId } from './vainId';

const GRAPHQL_ENDPOINT = process.env.API_LYTNIT_GRAPHQLAPIENDPOINTOUTPUT;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const SEED = 'lytnit';

/**
 * GraphQL client for making signed requests to AppSync
 */
class GraphQLClient {
    private credentials: any;

    constructor() {
        this.credentials = defaultProvider();
    }

    async request<T = any>(query: string, variables?: any): Promise<T> {
        if (!GRAPHQL_ENDPOINT) {
            throw new Error('GraphQL endpoint not configured');
        }

        const endpoint = new URL(GRAPHQL_ENDPOINT);
        const body = JSON.stringify({ query, variables });
        
        // Get AWS credentials
        const creds = await this.credentials();
        
        // Prepare request for aws4 signing
        const request = {
            method: 'POST',
            url: GRAPHQL_ENDPOINT,
            host: endpoint.host,
            path: endpoint.pathname,
            headers: {
                'Content-Type': 'application/json',
            },
            body,
            service: 'appsync',
            region: AWS_REGION,
        };

        // Sign the request using aws4
        const signedRequest = aws4.sign(request, {
            accessKeyId: creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
            sessionToken: creds.sessionToken,
        });
        
        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: 'POST',
            headers: signedRequest.headers as HeadersInit,
            body,
        });

        const result = await response.json();
        
        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            throw new Error(`GraphQL error: ${result.errors[0]?.message || 'Unknown error'}`);
        }

        return result.data;
    }
}

const graphqlClient = new GraphQLClient();

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
        const listIteratorsQuery = `
            query ListIterators($filter: ModelIteratorFilterInput) {
                listIterators(filter: $filter) {
                    items {
                        id
                        seed
                        iteration
                    }
                }
            }
        `;

        const existingData = await graphqlClient.request(listIteratorsQuery, {
            filter: { seed: { eq: SEED } }
        });
        
        if (existingData.listIterators.items && existingData.listIterators.items.length > 0) {
            // Update existing iterator
            const currentIterator = existingData.listIterators.items[0];
            const newIteration = (currentIterator.iteration || 0) + 1;
            
            const updateIteratorMutation = `
                mutation UpdateIterator($input: UpdateIteratorInput!) {
                    updateIterator(input: $input) {
                        id
                        seed
                        iteration
                    }
                }
            `;

            const updatedData = await graphqlClient.request(updateIteratorMutation, {
                input: {
                    id: currentIterator.id,
                    seed: SEED,
                    iteration: newIteration
                }
            });
            
            return updatedData.updateIterator?.iteration || 1;
        } else {
            // Create new iterator
            const createIteratorMutation = `
                mutation CreateIterator($input: CreateIteratorInput!) {
                    createIterator(input: $input) {
                        id
                        seed
                        iteration
                    }
                }
            `;

            const createdData = await graphqlClient.request(createIteratorMutation, {
                input: {
                    seed: SEED,
                    iteration: 1
                }
            });
            
            return createdData.createIterator?.iteration || 1;
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
        const getShortenedUrlQuery = `
            query GetShortenedUrl($id: ID!) {
                getShortenedUrl(id: $id) {
                    id
                }
            }
        `;

        const data = await graphqlClient.request(getShortenedUrlQuery, { id });
        return !!data.getShortenedUrl;
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
        const createShortenedUrlMutation = `
            mutation CreateShortenedUrl($input: CreateShortenedUrlInput!) {
                createShortenedUrl(input: $input) {
                    id
                    url
                    destination
                    ip
                    createdAt
                }
            }
        `;

        const newRecord = await graphqlClient.request(createShortenedUrlMutation, {
            input: {
                id: generatedId,
                url: cleanedUrl,
                destination: cleanedUrl,
                ip: clientIp,
                createdAt: new Date().toISOString()
            }
        });

        console.log('Database record created:', newRecord);

        if (newRecord.createShortenedUrl) {
            const result = `lytn.it/${generatedId}`;
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
