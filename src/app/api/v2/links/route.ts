import createLink from "./createLink";

export async function POST(request: Request) {
    const { url } = await request.json();
    const clientIp = request.headers.get('x-forwarded-for') || undefined;
    console.log('Client IP:', clientIp);
    console.log('URL:', url);
    const result = await createLink(url, clientIp);
    return Response.json({ id: result });
}