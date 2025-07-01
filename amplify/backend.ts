import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { vainId } from './functions/vainId/resource';
import { emailReportedLink } from './functions/emailReportedLink/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { env } from 'process';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  vainId,
  emailReportedLink
});

 const emailReportedLinkLambda = backend.emailReportedLink.resources.lambda

 const statement = new PolicyStatement({
  actions: ['ses:SendEmail'],
  resources: [
    `arn:aws:ses:${env.AWS_REGION}:${env.AWS_ACCOUNT_ID}:identity/${env.SOURCE_ADDRESS}`
  ],
 })

 emailReportedLinkLambda.addToRolePolicy(statement)