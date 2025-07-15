import importHandler from "./importHandler";

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const result = await importHandler(data.links, data.updateDuplicates);
        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error }, { status: 403 });
    }
}