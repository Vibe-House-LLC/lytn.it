import createReport from "./createReport";

export async function POST(request: Request) {
    const data = await request.json();
    console.log(data);
    const { url, shortId, reason, reporterEmail } = data;
    console.log('Request Headers:', request.headers);
    const clientIp = request.headers.get('x-forwarded-for') || undefined;
    console.log('Client IP:', clientIp);
    console.log('URL:', url);
    const result = await createReport({ url, shortId, reason, reporterEmail, clientIp });
    return Response.json({ id: result });
}