import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>({authMode: 'identityPool'});

export default async function shortenUrl(url: string): Promise<string | null> {
    try {
        const response = await client.queries.shorten({ url });
        return response.data || null;
    } catch (error) {
        console.error('Error shortening URL:', error);
        return null;
    }
} 