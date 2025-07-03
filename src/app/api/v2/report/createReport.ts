import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../../amplify/data/resource";
import amplifyConfig from "../../../../../amplify_outputs.json";

Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({ authMode: 'identityPool' });

interface CreateReportParams {
    url: string;
    shortId: string;
    reason: 'spam' | 'malware' | 'phishing' | 'inappropriate_content' | 'copyright_violation' | 'fraud' | 'harassment' | 'other';
    reporterEmail?: string;
    clientIp?: string | undefined;
}

export default async function createReport({ url, shortId, reason, reporterEmail, clientIp }: CreateReportParams) {
    console.log('Creating report for:', { url, shortId, reason, reporterEmail });
    
    // Look up the destination URL from the shortened URL record
    let destinationUrl = '';
    if (shortId) {
        try {
            console.log('Looking up shortened URL with ID:', shortId);
            const shortenedUrlRecord = await client.models.shortenedUrl.get({ id: shortId });
            console.log('Shortened URL lookup result:', JSON.stringify(shortenedUrlRecord, null, 2));
            
            if (!shortenedUrlRecord.data) {
                console.error('No shortened URL found with ID:', shortId);
                return null;
            }
            
            destinationUrl = shortenedUrlRecord.data.destination || '';
            console.log('Found destination URL:', destinationUrl);
            
            try {
                // Handle email validation - use provided email or anonymous placeholder
                const validEmail = reporterEmail && reporterEmail.trim() && reporterEmail.includes('@') 
                    ? reporterEmail.trim() 
                    : 'anonymous@report.local';

                const data = {
                    lytnUrl: url,
                    shortId: shortId,
                    destinationUrl: destinationUrl,
                    reason: reason,
                    reporterEmail: validEmail,
                    reporterIp: clientIp,
                    source: 'user_reported' as const,
                    owner: validEmail,
                    status: 'pending' as const,
                    createdAt: new Date().toISOString(),
                    shortenedUrlId: shortId, // Link to the shortened URL
                }
                console.log('Creating reportedLink with data:', JSON.stringify(data, null, 2));
                const result = await client.models.reportedLink.create(data, { selectionSet: ['id', 'createdAt'] });
                console.log('Report creation result:', JSON.stringify(result, null, 2));
                
                // Note: URL status is updated by admins only. 
                // The 'reported' status is implicit by the existence of this report.
                await client.queries.emailReportedLink({
                        link: url,
                        reason: reason,
                        reportedBy: validEmail,
                        reportedAt: result?.data?.createdAt ? new Date(result?.data?.createdAt).toISOString() : new Date().toISOString()
                })
                return result?.data?.id;
            } catch (error) {
                console.error('Error creating report:', error);
                return null;
            }
        } catch (error) {
            console.log('Error looking up shortened URL record:', error);
            console.log('Could not find shortened URL record for shortId:', shortId);
            
            // Debug: List existing shortened URLs to see what's available
            try {
                console.log('Attempting to list existing shortened URLs for debugging...');
                const existingUrls = await client.models.shortenedUrl.list({ 
                    limit: 10,
                    selectionSet: ['id', 'destination', 'status', 'createdAt']
                });
                console.log('Existing shortened URLs in database:', JSON.stringify(existingUrls, null, 2));
            } catch (debugError) {
                console.error('Debug query failed:', debugError);
            }
            
            return null;
        }
    }
}