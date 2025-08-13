import { defineAuth } from '@aws-amplify/backend';
import { emailReportedLink } from '../functions/emailReportedLink/resource';
import { userManagement } from '../functions/userManagement/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['admins'],
  access: (allow) => [
    allow.resource(emailReportedLink).to(['listUsersInGroup']),
    allow.resource(userManagement).to(['getUser', 'createUser', 'updateUserAttributes', 'addUserToGroup', 'removeUserFromGroup', 'deleteUser', 'enableUser', 'disableUser', 'setUserPassword', 'resetUserPassword', 'listUsers', 'listUsersInGroup', 'listGroupsForUser'])
  ]
});
