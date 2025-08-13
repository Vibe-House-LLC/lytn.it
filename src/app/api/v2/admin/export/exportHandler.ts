import { cookiesClient } from "@/utilities/amplify-utils";
import getClientAuthType, { isUserAdmin } from "@/utilities/clientAuthType";


const client = cookiesClient;

export default async function exportHandler() {
    const authType = await getClientAuthType();
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        throw new Error('Unauthorized - Admin access required');
    }

    const getLinks = async () => {
        let nextToken: string | null | undefined;
        const allLinks = [];

        do {
            const { data, nextToken: next } = await client.models.ShortenedUrl.list({
                nextToken,
                authMode: authType
            });

            allLinks.push(...data);
            nextToken = next;
        } while (nextToken != null);

        return allLinks;
    }

    const links = await getLinks();

    return links;
}