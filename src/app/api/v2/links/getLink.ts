import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../../amplify/data/resource";
import amplifyConfig from "../../../../../amplify_outputs.json";

Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({authMode: 'identityPool'});

export default async function getLink(id: string) {
    try {
        const result = await client.models.shortenedUrl.get({ id }, { selectionSet: ['destination'] });
        return result?.data?.destination
    } catch (error) {
        console.error('API route error:', error);
        return null;
    }
}