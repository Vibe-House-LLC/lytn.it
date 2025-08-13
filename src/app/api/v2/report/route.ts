import createReport from "./createReport";

export async function POST(request: Request) {
    try {
        const data = await request.json();
        console.log('Report request data:', data);
        const { url, shortId, reason, reporterEmail } = data;
        
        if (!url || !shortId || !reason) {
            return Response.json({ 
                error: 'Missing required fields: url, shortId, and reason are required' 
            }, { status: 400 });
        }
        
        console.log('Request Headers:', request.headers);
        const clientIp = request.headers.get('x-forwarded-for') || undefined;
        console.log('Client IP:', clientIp);
        console.log('URL:', url);
        
        const result = await createReport({ url, shortId, reason, reporterEmail, clientIp });
        
        if (result) {
            return Response.json({ id: result });
        } else {
            return Response.json({ 
                error: `Failed to create report - shortened URL '${shortId}' not found. Please verify the URL exists.` 
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Report API error:', error);
        return Response.json({ 
            error: 'Internal server error while creating report',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}