# API v2 Documentation

## Create a New Link

**Endpoint:** `PUT /api/v2/links`

Creates a new shortened lytn.it link with an automatically generated unique ID.

### Request

**Method:** `PUT`  
**Content-Type:** `application/json`

**Body:**
```json
{
  "url": "https://example.com/your-long-url"
}
```

**Parameters:**
- `url` (string, required): The URL to be shortened. Can be provided with or without protocol - if no protocol is specified, `http://` will be automatically added.

### Response

**Success (200):**
Returns the generated unique ID as a string.

```json
"abc123"
```

**Error:**
Returns an error message string describing the issue.

```json
"Error: URL parameter is required"
```

### Example Usage

```bash
curl -X PUT https://lytn.it/api/v2/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very-long-url"}'
```

**Response:**
```
"xY9kL2"
```

The shortened URL would then be accessible at: `https://lytn.it/xY9kL2`

### Notes

- IDs are generated using a custom VainID algorithm to ensure uniqueness
- The system automatically validates URLs and adds `http://` protocol if missing
- Duplicate ID conflicts are automatically resolved with retry logic
- Client IP addresses are logged for analytics (when available via `x-forwarded-for` header)
