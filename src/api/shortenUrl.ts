import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>({
    authMode: 'apiKey'
});

export default async function shortenUrl(url: string): Promise<string | null> {
    try {
        console.log('Calling shorten query with URL:', url);
        const response = await client.queries.shorten({ url });
        console.log('Shorten response:', response);
        console.log('Generated ID:', response.data);
        return response.data || null;
    } catch (error) {
        console.error('Error shortening URL:', error);
        console.error('Error details:', error);
        return null;
    }
} 