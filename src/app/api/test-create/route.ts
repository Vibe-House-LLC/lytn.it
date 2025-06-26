import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../amplify/data/resource";
import amplifyConfig from "../../../../amplify_outputs.json";

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();
        
        if (!url) {
            return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
        }
        
        console.log('Test create: creating record for URL:', url);
        
        // Configure Amplify
        Amplify.configure(amplifyConfig);
        
        const client = generateClient<Schema>({authMode: 'apiKey'});
        
        // Create a test record with a known ID
        const testId = `test-${Date.now()}`;
        
        console.log('Test create: attempting to create record with ID:', testId);
        
        const createResponse = await client.models.shortenedUrl.create({
            id: testId,
            url: url,
            destination: url,
            ip: 'test-ip',
            createdAt: new Date().toISOString()
        });
        
        console.log('Test create: create response:', createResponse);
        console.log('Test create: create response data:', createResponse.data);
        console.log('Test create: create response errors:', createResponse.errors);
        
        if (!createResponse.data) {
            return NextResponse.json({
                success: false,
                error: 'Failed to create record',
                createErrors: createResponse.errors
            });
        }
        
        // Now immediately try to read it back
        console.log('Test create: attempting to read back the record...');
        
        const getResponse = await client.models.shortenedUrl.get({ id: testId });
        console.log('Test create: get response:', getResponse);
        console.log('Test create: get response data:', getResponse.data);
        console.log('Test create: get response errors:', getResponse.errors);
        
        // Also try list operation
        const listResponse = await client.models.shortenedUrl.list({
            filter: { id: { eq: testId } }
        });
        console.log('Test create: list response:', listResponse);
        console.log('Test create: list response data:', listResponse.data);
        console.log('Test create: list response errors:', listResponse.errors);
        
        return NextResponse.json({
            success: true,
            testId,
            created: !!createResponse.data,
            canReadBack: {
                get: !!getResponse.data,
                list: (listResponse.data?.length || 0) > 0
            },
            debug: {
                createData: createResponse.data,
                getData: getResponse.data,
                listData: listResponse.data,
                createErrors: createResponse.errors,
                getErrors: getResponse.errors,
                listErrors: listResponse.errors
            }
        });
        
    } catch (error) {
        console.error('Test create error:', error);
        console.error('Test create error stack:', error instanceof Error ? error.stack : 'No stack');
        return NextResponse.json({ 
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
} 