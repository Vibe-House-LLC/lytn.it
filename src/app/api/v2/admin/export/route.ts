import exportHandler from "./exportHandler";

export async function GET() {
    try {
        const links = await exportHandler();
        return Response.json(links);
    } catch (error) {
        return Response.json({ error: error }, { status: 403 });
    }
}