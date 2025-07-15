import { defineFunction } from '@aws-amplify/backend';

export const linkImporter = defineFunction({
  name: 'linkImporter',
  entry: './handler.ts',
  timeoutSeconds: 60 * 5, // 5 minutes for large imports
});