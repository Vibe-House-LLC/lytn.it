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
    console.time('[IMPORT] importHandler total');
    const authType = await getClientAuthType();
    const isAdmin = await isUserAdmin();

    console.log('[IMPORT] Starting import', {
        numLinks: links?.length ?? 0,
        updateDuplicates,
        authType
    });

    if (!isAdmin) {
        console.warn('[IMPORT] Unauthorized import attempt by non-admin');
        throw new Error('Unauthorized - Admin access required');
    }


    const updateIterator = async (increment: number) => {
        // Step 1: Increment iterator by the number of successfully processed links
        // console.log('[IMPORT] updateIterator: increment', { increment });
        const iterator = await client.models.iterator.get({
            id: 'lytnit'
        }, { authMode: authType });

        if (iterator?.data?.iteration !== undefined) {
            await client.models.iterator.update({
                id: 'lytnit',
                iteration: increment
            }, { authMode: authType });
        } else {
            // If iterator doesn't exist yet, create it starting at the increment value
            await client.models.iterator.create({
                id: 'lytnit',
                iteration: increment
            }, { authMode: authType });
        }

        // Step 2: Generate new IDs using vainId until we hit one that isn't a duplicate
        // This mirrors the duplicate-check flow in createLink.ts but without a max attempt limit
        // Note: Each vainId call advances the iterator internally
        while (true) {
            const vainIdResp = await client.queries.vainId({}, { authMode: authType });
            const candidateId = vainIdResp?.data?.id || '';

            if (!candidateId) {
                // If we failed to get an ID for some reason, try again
                continue;
            }

            try {
                const existing = await client.models.ShortenedUrl.get({ id: candidateId }, { authMode: authType });
                const isDuplicate = !!existing?.data;

                if (!isDuplicate) {
                    break; // Found a free ID; iterator now points to the next available slot
                }
                // else: continue loop to advance to next ID
            } catch {
                // On errors fetching, assume not a duplicate and break to avoid stalling
                break;
            }
        }

        // Step 3: Decrement iterator by one so the next normal generation yields the found unique ID
        const currentIterResp = await client.models.iterator.get({ id: 'lytnit' }, { authMode: authType });
        const currentIteration = currentIterResp?.data?.iteration ?? 0;
        const nextIteration = Math.max(0, currentIteration - 1);
        // console.log('[IMPORT] updateIterator: decrementing iterator', { from: currentIteration, to: nextIteration });
        await client.models.iterator.update({
            id: 'lytnit',
            iteration: nextIteration
        }, { authMode: authType });
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

            console.debug('[IMPORT] Attempting create ShortenedUrl', { id: linkData.id, destination: linkData.destination, source: linkData.source, hasOwner: !!linkData.owner, status: linkData.status });
            const result = await client.models.ShortenedUrl.create(linkData, { authMode: authType });

            if (result?.data?.id) {
                // console.log('[IMPORT] Created ShortenedUrl', { id: result.data.id });
                successfulImports.push(result.data);
            } else {
                if (updateDuplicates) {
                    // console.log('[IMPORT] Create returned no id; attempting update for potential duplicate', { id: linkData.id });
                    await client.models.ShortenedUrl.update(linkData, { authMode: authType });
                } else {
                    // console.warn('[IMPORT] Failed to create ShortenedUrl and duplicates not updated; marking as failed', { id: linkData.id });
                    failedImports.push(link);
                }
            }
        }

        // After processing all links, update the iterator only when not updating duplicates
        if (!updateDuplicates) {
            console.log('[IMPORT] Updating iterator after import', { incrementBy: links.length });
            await updateIterator(links.length);
        }

        // const summary = { successfulCount: successfulImports.length, failedCount: failedImports.length };
        // console.log('[IMPORT] Finished import run', summary);
        console.timeEnd('[IMPORT] importHandler total');
        return {
            successfulImports,
            failedImports
        };
    } catch (error) {
        console.error('[IMPORT] Error importing links:', error);
        console.timeEnd('[IMPORT] importHandler total');
    }
}