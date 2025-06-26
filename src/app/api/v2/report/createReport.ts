import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../../../amplify/data/resource";
import amplifyConfig from "../../../../../amplify_outputs.json";

Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({ authMode: 'identityPool' });

interface CreateReportParams {
    url: string;
    shortId: string;
    reason: string;
    reporterEmail: string;
    clientIp?: string | undefined;
}

export default async function createReport({ url, shortId, reason, reporterEmail, clientIp }: CreateReportParams) {
    // Look up the destination URL from the shortened URL record
    let destinationUrl = '';
    if (shortId) {
        try {
            const shortenedUrlRecord = await client.models.shortenedUrl.get({ id: shortId });
            destinationUrl = shortenedUrlRecord.data?.destination || '';
            try {
                const data = {
                    lytnUrl: url,
                    shortId: shortId,
                    destinationUrl: destinationUrl,
                    reason: reason,
                    reporterEmail: reporterEmail,
                    reporterIp: clientIp
                }
                const result = await client.models.reportedLink.create(data, { selectionSet: ['id'] });
                return result?.data?.id;
            } catch (error) {
                console.error('Error creating report:', error);
                return null;
            }
        } catch (error) {
            console.log('Error looking up shortened URL record:', error);
            console.log('Could not find shortened URL record for shortId:', shortId);
        }
    }
}