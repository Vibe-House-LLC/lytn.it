import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../amplify/data/resource";
import amplifyConfig from "../../../../amplify_outputs.json";

Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({authMode: 'identityPool'});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
        }
        
        console.log('API route: fetching destination for ID:', id);
        console.log('API route: amplify config URL:', amplifyConfig.data?.url);
        console.log('API route: amplify config region:', amplifyConfig.data?.aws_region);
        
        try {
            const result = await client.models.ShortenedUrl.get({ id }, { selectionSet: ['destination'] });
            return NextResponse.json({ destination: result.data?.destination || null });
        } catch (error) {
            console.error('API route error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    } catch (error) {
        console.error('API route error:', error);
        console.error('API route error stack:', error instanceof Error ? error.stack : 'No stack');
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
} 