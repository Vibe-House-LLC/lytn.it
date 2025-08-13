import { CognitoIdentityProviderClient, 
         ListUsersCommand, 
         AdminGetUserCommand,
         AdminCreateUserCommand,
         AdminUpdateUserAttributesCommand,
         AdminAddUserToGroupCommand,
         AdminRemoveUserFromGroupCommand,
         AdminDeleteUserCommand,
         AdminEnableUserCommand,
         AdminDisableUserCommand,
         AdminSetUserPasswordCommand,
         AdminListGroupsForUserCommand,
         ListUsersInGroupCommand } from '@aws-sdk/client-cognito-identity-provider';
import { env } from '$amplify/env/userManagement';

const cognitoClient = new CognitoIdentityProviderClient({ region: env.AWS_REGION });

export interface UserManagementInput {
  operation: 'listUsers' | 'getUser' | 'createUser' | 'updateUser' | 'deleteUser' | 
            'enableUser' | 'disableUser' | 'addToGroup' | 'removeFromGroup' | 
            'setPassword' | 'getUserGroups' | 'listAdmins';
  userId?: string;
  email?: string;
  password?: string;
  temporary?: boolean;
  attributes?: Record<string, string>;
  groupName?: string;
  limit?: number;
  nextToken?: string;
  filter?: string;
}

export interface UserManagementOutput {
  success: boolean;
  data?: any;
  error?: string;
  nextToken?: string;
}

export const handler = async (event: any): Promise<UserManagementOutput> => {
  console.log('[UserManagement] Handler called with event:', JSON.stringify(event, null, 2));
  console.log('[UserManagement] Event type:', typeof event);
  console.log('[UserManagement] Event keys:', Object.keys(event || {}));
  console.log('[UserManagement] Event.arguments:', event?.arguments);
  console.log('[UserManagement] Environment variables:', {
    AMPLIFY_AUTH_USERPOOL_ID: env.AMPLIFY_AUTH_USERPOOL_ID,
    AWS_REGION: env.AWS_REGION,
    allEnvVars: Object.keys(env).filter(key => key.includes('AMPLIFY') || key.includes('AWS'))
  });
  
  // Extract arguments from GraphQL event structure if needed
  const actualEvent: UserManagementInput = event.arguments || event;
  console.log('[UserManagement] Actual event to process:', JSON.stringify(actualEvent, null, 2));
  
  const userPoolId = env.AMPLIFY_AUTH_USERPOOL_ID;
  
  if (!userPoolId) {
    console.error('[UserManagement] User pool ID not configured');
    return { success: false, error: 'User pool ID not configured' };
  }

  console.log('[UserManagement] Using user pool ID:', userPoolId);

  try {
    console.log('[UserManagement] Processing operation:', actualEvent.operation);
    switch (actualEvent.operation) {
      case 'listUsers':
        return await listUsers(userPoolId, actualEvent.limit, actualEvent.nextToken, actualEvent.filter);
      
      case 'getUser':
        if (!actualEvent.userId) return { success: false, error: 'User ID required' };
        return await getUser(userPoolId, actualEvent.userId);
      
      case 'createUser':
        if (!actualEvent.email) return { success: false, error: 'Email required' };
        return await createUser(userPoolId, actualEvent.email, actualEvent.password, actualEvent.temporary, actualEvent.attributes);
      
      case 'updateUser':
        if (!actualEvent.userId || !actualEvent.attributes) return { success: false, error: 'User ID and attributes required' };
        return await updateUser(userPoolId, actualEvent.userId, actualEvent.attributes);
      
      case 'deleteUser':
        if (!actualEvent.userId) return { success: false, error: 'User ID required' };
        return await deleteUser(userPoolId, actualEvent.userId);
      
      case 'enableUser':
        if (!actualEvent.userId) return { success: false, error: 'User ID required' };
        return await enableUser(userPoolId, actualEvent.userId);
      
      case 'disableUser':
        if (!actualEvent.userId) return { success: false, error: 'User ID required' };
        return await disableUser(userPoolId, actualEvent.userId);
      
      case 'addToGroup':
        if (!actualEvent.userId || !actualEvent.groupName) return { success: false, error: 'User ID and group name required' };
        return await addUserToGroup(userPoolId, actualEvent.userId, actualEvent.groupName);
      
      case 'removeFromGroup':
        if (!actualEvent.userId || !actualEvent.groupName) return { success: false, error: 'User ID and group name required' };
        return await removeUserFromGroup(userPoolId, actualEvent.userId, actualEvent.groupName);
      
      case 'setPassword':
        if (!actualEvent.userId || !actualEvent.password) return { success: false, error: 'User ID and password required' };
        return await setUserPassword(userPoolId, actualEvent.userId, actualEvent.password, actualEvent.temporary);
      
      case 'getUserGroups':
        if (!actualEvent.userId) return { success: false, error: 'User ID required' };
        return await getUserGroups(userPoolId, actualEvent.userId);
      
      case 'listAdmins':
        return await listAdmins(userPoolId, actualEvent.limit, actualEvent.nextToken);
      
      default:
        console.error('[UserManagement] Invalid operation received:', actualEvent.operation);
        console.error('[UserManagement] Valid operations:', ['listUsers', 'getUser', 'createUser', 'updateUser', 'deleteUser', 'enableUser', 'disableUser', 'addToGroup', 'removeFromGroup', 'setPassword', 'getUserGroups', 'listAdmins']);
        return { success: false, error: `Invalid operation: ${actualEvent.operation}` };
    }
  } catch (error) {
    console.error('User management error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

async function listUsers(userPoolId: string, limit = 50, nextToken?: string, filter?: string): Promise<UserManagementOutput> {
  console.log('[UserManagement] listUsers called with params:', { userPoolId, limit, nextToken, filter });
  
  const command = new ListUsersCommand({
    UserPoolId: userPoolId,
    Limit: Math.min(limit, 60), // Cognito max is 60
    PaginationToken: nextToken,
    Filter: filter,
  });

  console.log('[UserManagement] Sending ListUsersCommand:', {
    UserPoolId: userPoolId,
    Limit: Math.min(limit, 60),
    PaginationToken: nextToken,
    Filter: filter
  });

  const response = await cognitoClient.send(command);
  console.log('[UserManagement] Cognito response received:', {
    usersCount: response.Users?.length || 0,
    hasPaginationToken: !!response.PaginationToken,
    users: response.Users?.map(u => ({ username: u.Username, email: u.Attributes?.find(a => a.Name === 'email')?.Value }))
  });
  
  const users = response.Users?.map(user => ({
    username: user.Username,
    email: user.Attributes?.find(attr => attr.Name === 'email')?.Value,
    emailVerified: user.Attributes?.find(attr => attr.Name === 'email_verified')?.Value === 'true',
    status: user.UserStatus,
    enabled: user.Enabled,
    createdDate: user.UserCreateDate,
    lastModifiedDate: user.UserLastModifiedDate,
    attributes: user.Attributes,
  })) || [];

  const result = {
    success: true,
    data: {
      users,
      count: users.length,
    },
    nextToken: response.PaginationToken,
  };

  console.log('[UserManagement] Returning result:', {
    success: result.success,
    userCount: result.data.users.length,
    hasNextToken: !!result.nextToken
  });

  return result;
}

async function getUser(userPoolId: string, userId: string): Promise<UserManagementOutput> {
  const command = new AdminGetUserCommand({
    UserPoolId: userPoolId,
    Username: userId,
  });

  const response = await cognitoClient.send(command);
  
  const user = {
    username: response.Username,
    email: response.UserAttributes?.find(attr => attr.Name === 'email')?.Value,
    emailVerified: response.UserAttributes?.find(attr => attr.Name === 'email_verified')?.Value === 'true',
    status: response.UserStatus,
    enabled: response.Enabled,
    createdDate: response.UserCreateDate,
    lastModifiedDate: response.UserLastModifiedDate,
    attributes: response.UserAttributes,
  };

  return { success: true, data: { user } };
}

async function createUser(userPoolId: string, email: string, password?: string, temporary = true, attributes?: Record<string, string>): Promise<UserManagementOutput> {
  const userAttributes = [
    { Name: 'email', Value: email },
    { Name: 'email_verified', Value: 'true' },
  ];

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'email') {
        userAttributes.push({ Name: key, Value: value });
      }
    });
  }

  const command = new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: email,
    UserAttributes: userAttributes,
    TemporaryPassword: password,
    MessageAction: password ? 'SUPPRESS' : 'RESEND',
  });

  const response = await cognitoClient.send(command);
  
  return { 
    success: true, 
    data: { 
      user: {
        username: response.User?.Username,
        email,
        status: response.User?.UserStatus,
        enabled: response.User?.Enabled,
        createdDate: response.User?.UserCreateDate,
      }
    } 
  };
}

async function updateUser(userPoolId: string, userId: string, attributes: Record<string, string>): Promise<UserManagementOutput> {
  const userAttributes = Object.entries(attributes).map(([name, value]) => ({
    Name: name,
    Value: value,
  }));

  const command = new AdminUpdateUserAttributesCommand({
    UserPoolId: userPoolId,
    Username: userId,
    UserAttributes: userAttributes,
  });

  await cognitoClient.send(command);
  
  return { success: true, data: { message: 'User updated successfully' } };
}

async function deleteUser(userPoolId: string, userId: string): Promise<UserManagementOutput> {
  const command = new AdminDeleteUserCommand({
    UserPoolId: userPoolId,
    Username: userId,
  });

  await cognitoClient.send(command);
  
  return { success: true, data: { message: 'User deleted successfully' } };
}

async function enableUser(userPoolId: string, userId: string): Promise<UserManagementOutput> {
  const command = new AdminEnableUserCommand({
    UserPoolId: userPoolId,
    Username: userId,
  });

  await cognitoClient.send(command);
  
  return { success: true, data: { message: 'User enabled successfully' } };
}

async function disableUser(userPoolId: string, userId: string): Promise<UserManagementOutput> {
  const command = new AdminDisableUserCommand({
    UserPoolId: userPoolId,
    Username: userId,
  });

  await cognitoClient.send(command);
  
  return { success: true, data: { message: 'User disabled successfully' } };
}

async function addUserToGroup(userPoolId: string, userId: string, groupName: string): Promise<UserManagementOutput> {
  const command = new AdminAddUserToGroupCommand({
    UserPoolId: userPoolId,
    Username: userId,
    GroupName: groupName,
  });

  await cognitoClient.send(command);
  
  return { success: true, data: { message: `User added to ${groupName} group successfully` } };
}

async function removeUserFromGroup(userPoolId: string, userId: string, groupName: string): Promise<UserManagementOutput> {
  const command = new AdminRemoveUserFromGroupCommand({
    UserPoolId: userPoolId,
    Username: userId,
    GroupName: groupName,
  });

  await cognitoClient.send(command);
  
  return { success: true, data: { message: `User removed from ${groupName} group successfully` } };
}

async function setUserPassword(userPoolId: string, userId: string, password: string, temporary = false): Promise<UserManagementOutput> {
  const command = new AdminSetUserPasswordCommand({
    UserPoolId: userPoolId,
    Username: userId,
    Password: password,
    Permanent: !temporary,
  });

  await cognitoClient.send(command);
  
  return { success: true, data: { message: 'Password set successfully' } };
}

async function getUserGroups(userPoolId: string, userId: string): Promise<UserManagementOutput> {
  const command = new AdminListGroupsForUserCommand({
    UserPoolId: userPoolId,
    Username: userId,
  });

  const response = await cognitoClient.send(command);
  
  const groups = response.Groups?.map(group => ({
    groupName: group.GroupName,
    description: group.Description,
    creationDate: group.CreationDate,
    lastModifiedDate: group.LastModifiedDate,
  })) || [];

  return { success: true, data: { groups } };
}

async function listAdmins(userPoolId: string, limit = 50, nextToken?: string): Promise<UserManagementOutput> {
  const command = new ListUsersInGroupCommand({
    UserPoolId: userPoolId,
    GroupName: 'admins',
    Limit: Math.min(limit, 60),
    NextToken: nextToken,
  });

  const response = await cognitoClient.send(command);
  
  const admins = response.Users?.map(user => ({
    username: user.Username,
    email: user.Attributes?.find(attr => attr.Name === 'email')?.Value,
    emailVerified: user.Attributes?.find(attr => attr.Name === 'email_verified')?.Value === 'true',
    status: user.UserStatus,
    enabled: user.Enabled,
    createdDate: user.UserCreateDate,
    lastModifiedDate: user.UserLastModifiedDate,
  })) || [];

  return {
    success: true,
    data: {
      admins,
      count: admins.length,
    },
    nextToken: response.NextToken,
  };
}