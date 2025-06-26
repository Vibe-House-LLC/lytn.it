import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";
import amplifyConfig from "../../amplify_outputs.json";

// Configure Amplify with the same config as the Lambda function
Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({authMode: 'apiKey'});

export default async function fetchUrl(id: string) {
    try {
        console.log('fetchUrl called with ID:', id);
        const response = await client.models.shortenedUrl.get({ id });
        console.log('fetchUrl response:', response);
        console.log('fetchUrl response data:', response.data);
        console.log('fetchUrl response errors:', response.errors);
        return response.data?.destination || null;
    } catch (error) {
        console.error('Error fetching URL:', error);
        return null;
    }
}
