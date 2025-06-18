import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>({authMode: 'identityPool'});

export default async function fetchUrl(id: string) {
    try {
        const response = await client.models.shortenedUrl.get({ id });
        return response.data?.destination || null;
    } catch (error) {
        console.error('Error fetching URL:', error);
        return null;
    }
}
