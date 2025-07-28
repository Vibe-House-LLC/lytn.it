import warmUp from "./warmUp";

export async function GET() {
    console.info('Warming up API...')
    try {
        const result = await warmUp()
        console.info('Warm up response:', result)
        return Response.json({ message: 'API is running' });
    } catch (error) {
        console.error('API route error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
} 