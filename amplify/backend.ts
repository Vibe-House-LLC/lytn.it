import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { vainId } from './functions/vainId/resource';
import { emailReportedLink } from './functions/emailReportedLink/resource';
import { userManagement } from './functions/userManagement/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  vainId,
  emailReportedLink,
  userManagement
});

const emailReportedLinkLambda = backend.emailReportedLink.resources.lambda
const userManagementLambda = backend.userManagement.resources.lambda

const emailStatement = new PolicyStatement({
  actions: ['ses:SendEmail'],
  resources: ['*'],
})

const cognitoStatement = new PolicyStatement({
  actions: [
    'cognito-idp:AdminGetUser',
    'cognito-idp:AdminCreateUser',
    'cognito-idp:AdminUpdateUserAttributes',
    'cognito-idp:AdminAddUserToGroup',
    'cognito-idp:AdminRemoveUserFromGroup',
    'cognito-idp:AdminDeleteUser',
    'cognito-idp:AdminEnableUser',
    'cognito-idp:AdminDisableUser',
    'cognito-idp:AdminSetUserPassword',
    'cognito-idp:AdminResetUserPassword',
    'cognito-idp:ListUsers',
    'cognito-idp:ListUsersInGroup',
    'cognito-idp:AdminListGroupsForUser',
  ],
  resources: ['*'],
})

emailReportedLinkLambda.addToRolePolicy(emailStatement)
userManagementLambda.addToRolePolicy(cognitoStatement)