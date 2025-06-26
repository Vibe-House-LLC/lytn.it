import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../amplify/data/resource";
import amplifyConfig from "../../../../amplify_outputs.json";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
        }
        
        console.log('API route: fetching destination for ID:', id);
        console.log('API route: amplify config URL:', amplifyConfig.data?.url);
        console.log('API route: amplify config API key:', amplifyConfig.data?.api_key?.substring(0, 10) + '...');
        console.log('API route: amplify config region:', amplifyConfig.data?.aws_region);
        
        // Configure Amplify fresh each time to avoid any caching issues
        Amplify.configure(amplifyConfig);
        
        // Test multiple auth modes to see which one works
        const authModes = ['apiKey', 'identityPool', 'userPool'] as const;
        const results: Record<string, {
            listFound?: number;
            getFound?: boolean;
            listErrors?: unknown;
            getErrors?: unknown;
            destination?: string | null;
            error?: string;
        }> = {};
        
        for (const authMode of authModes) {
            try {
                console.log(`API route: testing with authMode: ${authMode}`);
                const client = generateClient<Schema>({authMode});
                
                // Test list operation
                const listResponse = await client.models.shortenedUrl.list({
                    filter: { id: { eq: id } }
                });
                
                // Test get operation  
                const getResponse = await client.models.shortenedUrl.get({ id });
                
                results[authMode] = {
                    listFound: listResponse.data?.length || 0,
                    getFound: !!getResponse.data,
                    listErrors: listResponse.errors,
                    getErrors: getResponse.errors,
                    destination: getResponse.data?.destination || 
                               (listResponse.data && listResponse.data.length > 0 ? listResponse.data[0].destination : null)
                };
                
                console.log(`Results for ${authMode}:`, results[authMode]);
                
            } catch (authError) {
                console.error(`Error with ${authMode}:`, authError);
                results[authMode] = {
                    error: authError instanceof Error ? authError.message : String(authError)
                };
            }
        }
        
        // Find the first successful result
        const successfulResult = Object.values(results).find(r => r.destination);
        
        return NextResponse.json({ 
            destination: successfulResult?.destination || null,
            debug: {
                config: {
                    url: amplifyConfig.data?.url,
                    region: amplifyConfig.data?.aws_region,
                    hasApiKey: !!amplifyConfig.data?.api_key
                },
                authModeResults: results
            }
        });
    } catch (error) {
        console.error('API route error:', error);
        console.error('API route error stack:', error instanceof Error ? error.stack : 'No stack');
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
} 