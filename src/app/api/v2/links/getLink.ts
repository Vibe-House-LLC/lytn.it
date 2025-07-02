import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../../amplify/data/resource";
import amplifyConfig from "../../../../../amplify_outputs.json";

Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({authMode: 'identityPool'});

export default async function getLink(id: string) {
    try {
        const result = await client.models.shortenedUrl.get({ id }, { 
            selectionSet: ['destination', 'status', 'deletedAt'] 
        });
        
        const linkData = result?.data;
        
        // Check if link exists
        if (!linkData) {
            return null;
        }
        
        // Check if link is deleted
        if (linkData.deletedAt) {
            return null;
        }
        
        // Check if link is inactive
        if (linkData.status === 'inactive') {
            return null;
        }
        
        // Return destination for active and reported links
        return linkData.destination;
    } catch (error) {
        console.error('API route error:', error);
        return null;
    }
}