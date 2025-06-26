import { NextRequest } from "next/server";
import createLink from "./createLink";
import getLink from "./getLink";

export async function POST(request: Request) {
    const { url } = await request.json();
    const clientIp = request.headers.get('x-forwarded-for') || undefined;
    console.log('Client IP:', clientIp);
    console.log('URL:', url);
    const result = await createLink(url, clientIp);
    return Response.json({ id: result });
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const id = searchParams.get('id')

        if (!id) {
            return Response.json({ error: 'ID parameter is required' }, { status: 400 });
        }

        try {
            const result = await getLink(id)
            return Response.json({ destination: result || null });
        } catch (error) {
            console.error('API route error:', error);
            return Response.json({ error: 'Internal server error' }, { status: 500 });
        }
    } catch (error) {
        console.error('API route error:', error);
        console.error('API route error stack:', error instanceof Error ? error.stack : 'No stack');
        return Response.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
} 