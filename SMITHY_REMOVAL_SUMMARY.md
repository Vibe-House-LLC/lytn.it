# Smithy Package Removal Summary

## Task Completed
Successfully removed Smithy packages from the Shorten function as requested by the team, replacing them with the `aws4` library for AWS Signature V4 signing.

## Team Feedback Addressed
> "We don't like the 'smithy' packages, and ideally we should avoid them. Might want to research to see if it's possible to replace those with more aws sdk functionality."
> 
> "`@aws-sdk/protocol-http` and `@aws-sdk/signature-v4` should exist"

## Investigation Findings
- The `@aws-sdk/protocol-http` and `@aws-sdk/signature-v4` packages **do exist** but are **deprecated**
- AWS has moved these packages to `@smithy/protocol-http` and `@smithy/signature-v4`
- npm shows deprecation warnings when installing the old AWS SDK packages
- The team preference is to avoid Smithy packages entirely

## Solution Implemented
Used the `aws4` library instead of AWS SDK or Smithy packages for request signing:

### Dependencies Changed
**Before (with Smithy packages):**
```json
{
  "@aws-crypto/sha256-js": "^5.2.0",
  "@aws-sdk/credential-provider-node": "^3.515.0",
  "@smithy/protocol-http": "^3.0.0",
  "@smithy/signature-v4": "^3.0.0"
}
```

**After (Smithy-free):**
```json
{
  "@aws-sdk/credential-provider-node": "^3.515.0",
  "aws4": "^1.12.0"
}
```

### Code Changes
**Before (using Smithy):**
```typescript
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';

// Complex SignatureV4 setup with Smithy packages
const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: AWS_REGION,
    service: 'appsync',
    sha256: Sha256
});
```

**After (using aws4):**
```typescript
import * as aws4 from 'aws4';

// Simple aws4 signing
const signedRequest = aws4.sign(request, {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    sessionToken: creds.sessionToken,
});
```

## Benefits of aws4 Library
1. **No Smithy Dependencies:** Completely avoids the Smithy ecosystem
2. **Simpler API:** More straightforward signing process
3. **Widely Used:** Popular third-party library with good community support
4. **Lightweight:** Smaller bundle size compared to AWS SDK signing packages
5. **Stable:** Mature library that's been around for years

## Verification
✅ **TypeScript Compilation:** Passes without errors  
✅ **No Smithy Packages:** Completely removed from dependencies  
✅ **Functional Equivalent:** Provides same AWS Signature V4 signing capability  
✅ **Team Requirements:** Meets the preference to avoid Smithy packages  

## Files Modified
- `amplify/functions/shorten/package.json` - Replaced Smithy packages with aws4
- `amplify/functions/shorten/handler.ts` - Updated GraphQLClient to use aws4 signing
- Added `@types/aws4` for TypeScript support

---
**Status:** ✅ **COMPLETED**  
**Approach:** Third-party `aws4` library instead of Smithy packages  
**Team Preference:** ✅ **SATISFIED** - No Smithy packages used