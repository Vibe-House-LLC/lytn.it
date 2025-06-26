import type { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../data/resource';
// @ts-ignore
import amplifyConfig from '../../../amplify_outputs.json';

// Configure Amplify with the config file
Amplify.configure(amplifyConfig);

const client = generateClient<Schema>({
  authMode: 'apiKey'
});

export const handler: Handler = async (event, context) => {
  const { lytnUrl, shortId, reason, reporterEmail } = event.arguments;
  
  // Get the client IP from the request context
  const reporterIp = event.requestContext?.http?.sourceIp || 
                     event.headers?.['x-forwarded-for'] || 
                     'unknown';

  try {
    // Look up the destination URL from the shortened URL record
    let destinationUrl = '';
    if (shortId) {
      try {
        const shortenedUrlRecord = await client.models.shortenedUrl.get({ id: shortId });
        destinationUrl = shortenedUrlRecord.data?.destination || '';
      } catch (error) {
        console.log('Could not find shortened URL record for shortId:', shortId);
      }
    }

    // Create the reported link record
    const reportedLink = await client.models.reportedLink.create({
      lytnUrl,
      shortId: shortId || '',
      destinationUrl,
      reason: reason || '',
      reporterEmail: reporterEmail || '',
      reporterIp,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // TODO: Send email notification to admins
    // This would typically involve using AWS SES or another email service
    // For now, we'll just log the event
    console.log('Link reported:', {
      id: reportedLink.data?.id,
      lytnUrl,
      shortId,
      destinationUrl,
      reason,
      reporterEmail,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Link reported successfully',
      reportId: reportedLink.data?.id
    };
  } catch (error) {
    console.error('Error reporting link:', error);
    return {
      success: false,
      message: 'Failed to report link',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 