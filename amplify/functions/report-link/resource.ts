import { defineFunction } from '@aws-amplify/backend';
 
export const reportLink = defineFunction({
  name: 'reportLink',
  entry: './handler.ts'
}); 