import { cookiesClient, runWithAmplifyServerContext } from "@/utilities/amplify-utils";
import { getCurrentUser } from "aws-amplify/auth/server";
import { cookies } from "next/headers";


const client = cookiesClient;

interface CreateReportParams {
    url: string;
    shortId: string;
    reason: 'spam' | 'malware' | 'phishing' | 'inappropriate_content' | 'copyright_violation' | 'fraud' | 'harassment' | 'other';
    reporterEmail?: string;
    clientIp?: string | undefined;
}

/**
 * Validates email format using a robust regex
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export default async function createReport({ url, shortId, reason, reporterEmail, clientIp }: CreateReportParams) {
    console.log('Creating report for:', { url, shortId, reason, reporterEmail });

    let loggedIn: 'identityPool' | 'userPool' = 'identityPool';
    try {
        const userDetails = await runWithAmplifyServerContext({
            nextServerContext: { cookies },
            operation: (contextSpec) => getCurrentUser(contextSpec)
        });

        console.log('userDetails:', userDetails);

        loggedIn = 'userPool';

        console.log('loggedIn:', loggedIn);
    } catch (error) {
        console.error('Error getting user details:', error);
        loggedIn = 'identityPool';
    }
    
    // Early return if shortId is falsy
    if (!shortId) {
        console.error('No shortId provided for report creation');
        return null;
    }
    
    // Look up the destination URL from the shortened URL record
    let destinationUrl = '';
    try {
        console.log('Looking up shortened URL with ID:', shortId);
        const shortenedUrlRecord = await client.models.ShortenedUrl.get({ id: shortId }, { authMode: loggedIn, selectionSet: ['id', 'destination'] });
        console.log('Shortened URL lookup result:', JSON.stringify(shortenedUrlRecord, null, 2));
        
        if (!shortenedUrlRecord.data) {
            console.error('No shortened URL found with ID:', shortId);
            return null;
        }
        
        destinationUrl = shortenedUrlRecord.data.destination || '';
        console.log('Found destination URL:', destinationUrl);
        
        try {
            // Handle email validation - use provided email or return null
            const validEmail = reporterEmail && reporterEmail.trim() && isValidEmail(reporterEmail.trim()) 
                ? reporterEmail.trim() 
                : null;

            const data = {
                lytnUrl: url,
                shortId: shortId,
                destinationUrl: destinationUrl,
                reason: reason,
                reporterEmail: validEmail,
                reporterIp: clientIp,
                source: 'user_reported' as const,
                status: 'pending' as const,
                createdAt: new Date().toISOString(),
                shortenedUrlId: shortId,
            }
            console.log('Creating reportedLink with data:', JSON.stringify(data, null, 2));
            const result = await client.models.ReportedLink.create(data, { selectionSet: ['id', 'createdAt'], authMode: loggedIn });
            console.log('Report creation result:', JSON.stringify(result, null, 2));
            
            await client.queries.emailReportedLink({
                    link: url,
                    reason: reason,
                    reportedBy: validEmail,
                    reportedAt: result?.data?.createdAt ? new Date(result?.data?.createdAt).toISOString() : new Date().toISOString()
            }, { authMode: loggedIn });
            return result?.data?.id || null;
        } catch (error) {
            console.error('Error creating report:', error);
            return null;
        }
    } catch (error) {
        console.log('Error looking up shortened URL record:', error);
        console.log('Could not find shortened URL record for shortId:', shortId);
        
        return null;
    }
}