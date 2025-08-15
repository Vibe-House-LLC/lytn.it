import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";

interface LinkToImport {
    id: string;
    destination: string;
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

const client = generateClient<Schema>();

// Function to sanitize and validate URLs
const sanitizeUrl = (url: string): string => {
    // Trim whitespace
    let sanitized = url.trim();
    
    // If URL doesn't start with a protocol, assume https
    if (!sanitized.match(/^https?:\/\//i)) {
        sanitized = 'https://' + sanitized;
    }
    
    try {
        // Use URL constructor to validate and normalize the URL
        const urlObj = new URL(sanitized);
        return urlObj.toString();
    } catch (error) {
        // If URL constructor fails, do basic encoding of spaces and return
        console.log('[IMPORT] sanitizeUrl error', error);
        return sanitized.replace(/\s+/g, '%20');
    }
};

export const importLinks = async (links: LinkToImport[], updateDuplicates: boolean = false) => {

    const updateIterator = async (increment: number) => {
        // Step 1: Increment iterator by the number of successfully processed links
        // console.log('[IMPORT] updateIterator: increment', { increment });
        const iterator = await client.models.iterator.get({
            id: 'lytnit'
        }, { authMode: 'userPool' });

        if (iterator?.data?.iteration !== undefined) {
            await client.models.iterator.update({
                id: 'lytnit',
                iteration: increment
            }, { authMode: 'userPool' });
        } else {
            // If iterator doesn't exist yet, create it starting at the increment value
            await client.models.iterator.create({
                id: 'lytnit',
                iteration: increment
            }, { authMode: 'userPool' });
        }

        // Step 2: Generate new IDs using vainId until we hit one that isn't a duplicate
        // This mirrors the duplicate-check flow in createLink.ts but without a max attempt limit
        // Note: Each vainId call advances the iterator internally
        while (true) {
            const vainIdResp = await client.queries.vainId({}, { authMode: 'userPool' });
            const candidateId = vainIdResp?.data?.id || '';

            if (!candidateId) {
                // If we failed to get an ID for some reason, try again
                continue;
            }

            try {
                const existing = await client.models.ShortenedUrl.get({ id: candidateId }, { authMode: 'userPool' });
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
        const currentIterResp = await client.models.iterator.get({ id: 'lytnit' }, { authMode: 'userPool' });
        const currentIteration = currentIterResp?.data?.iteration ?? 0;
        const nextIteration = Math.max(0, currentIteration - 1);
        // console.log('[IMPORT] updateIterator: decrementing iterator', { from: currentIteration, to: nextIteration });
        await client.models.iterator.update({
            id: 'lytnit',
            iteration: nextIteration
        }, { authMode: 'userPool' });
    };

    try {
        const successfulImports = [];
        const failedImports = [];
        let currentIndex = 0;

        for (const link of links) {
            currentIndex++;
            console.clear();
            console.log(`[IMPORT] Processing ${currentIndex}/${links.length}`);

            // Prepare the data object with required fields
            // Sanitize and validate the destination URL
            const sanitizedDestination = sanitizeUrl(link.destination);
            
            const linkData: ShortenedUrlData = {
                id: link.id,
                destination: sanitizedDestination,
                source: 'upload',
                owner: null
            };

            // console.debug('[IMPORT] Attempting create ShortenedUrl', { id: linkData.id, destination: linkData.destination, source: linkData.source, hasOwner: !!linkData.owner, status: linkData.status });
            const result = await client.models.ShortenedUrl.create(linkData, { authMode: 'userPool' });

            // console.log('[IMPORT] result', result);

            if (result?.data?.id) {
                // console.log('[IMPORT] Created ShortenedUrl', { id: result.data.id });
                successfulImports.push(result.data);
            } else {
                if (updateDuplicates) {
                    // console.log('[IMPORT] Create returned no id; attempting update for potential duplicate', { id: linkData.id });
                    try {
                        const updateResult = await client.models.ShortenedUrl.update(linkData, { authMode: 'userPool' });
                        if (updateResult?.data?.id) {
                            // console.log('[IMPORT] Updated ShortenedUrl', { id: updateResult.data.id });
                            successfulImports.push(updateResult.data);
                        } else {
                            // console.warn('[IMPORT] Update operation failed or returned no data', { id: linkData.id });
                            failedImports.push(link);
                        }
                    } catch (updateError) {
                        // console.error('[IMPORT] Update operation threw error', { id: linkData.id, error: updateError });
                        console.log('[IMPORT] Update operation threw error', { id: linkData.id, error: updateError });
                        failedImports.push(link);
                    }
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
        // console.timeEnd('[IMPORT] importHandler total');
        return {
            successfulImports,
            failedImports
        };
    } catch (error) {
        console.error('[IMPORT] Error importing links:', error);
        // console.timeEnd('[IMPORT] importHandler total');
        return {
            successfulImports: [],
            failedImports: links // Return all links as failed when an error occurs
        };
    }
}