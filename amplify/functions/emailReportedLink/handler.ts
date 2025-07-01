// amplify/custom/CustomNotifications/emailer.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
    CognitoIdentityProviderClient,
    ListUsersInGroupCommand,
    UserType
} from '@aws-sdk/client-cognito-identity-provider';
import type { Handler } from 'aws-lambda';
import { env } from '$amplify/env/emailReportedLink'

const client = new CognitoIdentityProviderClient();

interface LinkReport {
    link: string;
    reason: string;
    reportedBy: string;
    reportedAt: string;
}

const sesClient = new SESClient({ region: env.AWS_REGION });

const listUsersInGroup = async () => {
    const command = new ListUsersInGroupCommand({
        GroupName: 'admins',
        UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID
    });
    const result = await client.send(command);
    const usersEmails = createUsersEmailsArray(result.Users || []);
    return usersEmails;
};

const createUsersEmailsArray = (users: UserType[]) => {
    return users.map((user) => user.Attributes?.find((attribute) => attribute.Name === 'email')?.Value).filter((email) => email !== undefined);
};

const sendEmail = async (linkReport: LinkReport) => {
    const { link, reason, reportedBy, reportedAt } = linkReport;

    const usersEmails = await listUsersInGroup();

    const textBody = `
    A link has been reported.\n
    Link: ${link}\n
    Reason: ${reason}\n
    Reported by: ${reportedBy}\n
    Reported at: ${reportedAt}\n
    `;

    const body = `
    <h3>A link has been reported.</h3>
    <p>Link: <a href="${link}">${link}</a></p>
    <p>Reason: ${reason}</p>
    <p>Reported by: ${reportedBy}</p>
    <p>Reported at: ${reportedAt}</p>
    `;

    const command = new SendEmailCommand({
        Source: process.env.SOURCE_ADDRESS,
        Destination: {
            ToAddresses: usersEmails
        },
        Message: {
            Body: {
                Text: { Data: textBody },
                Html: { Data: body }
            },
            Subject: { Data: 'Link Reported' }
        }
    });

    try {
        const result = await sesClient.send(command);
        console.log(`Email sent to ${usersEmails.join(', ')}: ${result.MessageId}`);
    } catch (error) {
        console.error(`Error sending email to ${usersEmails.join(', ')}: ${error}`);
        throw new Error(`Failed to send email to ${usersEmails.join(', ')}`, { cause: error });
    }
};

// define the handler to process messages from the SNS topic and send via SES
export const handler: Handler = async (event) => {
    const { link, reason, reportedBy, reportedAt } = event.payload;
    try {
        const result = await sendEmail({ link, reason, reportedBy, reportedAt });
        return result
    } catch (error) {
        console.error(`Error sending email: ${error}`);
        throw new Error(`Failed to send email`, { cause: error });
    }
};