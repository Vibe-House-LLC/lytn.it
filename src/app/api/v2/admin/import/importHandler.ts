import { cookiesClient } from "@/utilities/amplify-utils";
import getClientAuthType, { isUserAdmin } from "@/utilities/clientAuthType";

interface LinkToImport {
    id: string;
    destination: string;
    createdAt?: string; // ISO 8601 date string
    ip?: string; // IP address of creator
    owner?: string; // Username of owner (defaults to current user)
    source?: 'upload' | 'manual' | 'api' | 'import'; // Source of creation (defaults to upload)
    status?: 'active' | 'reported' | 'inactive'; // Status of the link
}

interface ShortenedUrlData {
    id: string;
    destination: string;
    source: 'upload' | 'manual' | 'api' | 'import';
    createdAt?: string;
    ip?: string;
    owner?: string | null;
    status?: 'active' | 'reported' | 'inactive';
}

const client = cookiesClient;

export default async function importHandler(links: LinkToImport[], updateDuplicates: boolean = false) {
    const authType = await getClientAuthType();
    const isAdmin = await isUserAdmin();

    if (!isAdmin) {
        throw new Error('Unauthorized - Admin access required');
    }


    const updateIterator = async (increment: number) => {
        const iterator = await client.models.iterator.get({
            id: 'lytnit'
        }, { authMode: authType });
        if (iterator?.data?.iteration) {
            await client.models.iterator.update({
                id: 'lytnit',
                iteration: increment
            });
        }
    };

    try {
        const successfulImports = [];
        const failedImports = [];

        for (const link of links) {
            // Prepare the data object with required fields
            const linkData: ShortenedUrlData = {
                id: link.id,
                destination: link.destination,
                source: link.source || 'upload', // Default to 'upload' if not provided
                owner: null
            };

            // Add optional fields if they exist
            if (link.createdAt) {
                linkData.createdAt = link.createdAt;
            }

            if (link.ip) {
                linkData.ip = link.ip;
            }

            if (link.owner) {
                linkData.owner = `${link.owner}::${link.owner}`;
            }
            // Note: If owner is not provided, it defaults to current user (handled by the model)

            if (link.status) {
                linkData.status = link.status;
            }

            const result = await client.models.ShortenedUrl.create(linkData, { authMode: authType });

            if (result?.data?.id) {
                successfulImports.push(result.data);
            } else {
                if (updateDuplicates) {
                    await client.models.ShortenedUrl.update(linkData, { authMode: authType });
                } else {
                    failedImports.push(link);
                }
            }
        }

        // After processing all links, update the iterator only when not updating duplicates
        if (!updateDuplicates) {
            await updateIterator(links.length);
        }

        return {
            successfulImports,
            failedImports
        };
    } catch (error) {
        console.error('Error importing links:', error);
    }
}