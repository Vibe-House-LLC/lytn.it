import { defineFunction } from '@aws-amplify/backend';

export const userManagement = defineFunction({
  name: 'userManagement',
  entry: './handler.ts',
  environment: {
    AMPLIFY_AUTH_USERPOOL_ID: 'us-east-1_PgvhlwlGT' // From amplify_outputs.json
  }
});