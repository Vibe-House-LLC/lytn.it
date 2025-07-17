import exportHandler from "./exportHandler";

export async function GET() {
    try {
        const links = await exportHandler();
        return Response.json(links);
    } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 403 });
    }
}