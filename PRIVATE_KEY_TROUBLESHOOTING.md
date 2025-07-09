# Private Key Troubleshooting Guide

This guide helps you resolve common issues with Google Sheets private key configuration.

## Common Error: `error:1E08010C:DECODER routines::unsupported`

This error occurs when the private key format is incorrect. Here's how to fix it:

### Step 1: Get the Correct Private Key Format

1. Open your service account JSON file
2. Find the `private_key` field
3. Copy the ENTIRE value including quotes

Example from JSON:
\`\`\`json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
}
\`\`\`

### Step 2: Set Environment Variable Correctly

#### For Vercel Deployment:
\`\`\`
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
\`\`\`

#### For Local Development (.env.local):
\`\`\`
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"
\`\`\`

### Step 3: Verify Your Setup

The updated code includes automatic private key formatting that handles:
- ✅ Escaped newlines (`\n` → actual newlines)
- ✅ Surrounding quotes removal
- ✅ Proper BEGIN/END marker validation
- ✅ Whitespace cleanup

### Step 4: Test Your Configuration

Use the HEAD endpoint to test your connection:
\`\`\`bash
curl -I http://localhost:3000/api/sheets
\`\`\`

Success response headers:
\`\`\`
X-Connection-Status: success
X-Sheets-ID: 1ABC123...
\`\`\`

### Step 5: Common Mistakes to Avoid

❌ **Don't do this:**
- Remove the `\n` characters
- Split the key across multiple lines in Vercel
- Remove the BEGIN/END markers
- Add extra spaces or characters

✅ **Do this:**
- Copy the exact value from the JSON file
- Keep the `\n` characters for Vercel
- Include the full key with markers
- Use quotes around the entire value

### Step 6: Alternative Method

If you're still having issues, try this alternative approach:

1. **Base64 encode your private key:**
\`\`\`bash
echo "YOUR_PRIVATE_KEY_HERE" | base64
\`\`\`

2. **Set the base64 value:**
\`\`\`
GOOGLE_SHEETS_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...
\`\`\`

3. **Decode in your code:**
\`\`\`javascript
const privateKey = Buffer.from(process.env.GOOGLE_SHEETS_PRIVATE_KEY_BASE64, 'base64').toString()
\`\`\`

### Step 7: Debugging Tips

If you're still having issues:

1. **Check the key length:** Should be around 1600+ characters
2. **Verify the format:** Must start with `-----BEGIN PRIVATE KEY-----`
3. **Test locally first:** Make sure it works in development
4. **Check Vercel logs:** Look for specific error messages

### Step 8: Environment Variable Examples

#### Correct Format for Vercel:
\`\`\`
GOOGLE_SHEETS_CLIENT_EMAIL=dashboard-service@my-project-123456.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
\`\`\`

#### Correct Format for Local (.env.local):
\`\`\`
GOOGLE_SHEETS_CLIENT_EMAIL=dashboard-service@my-project-123456.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...
-----END PRIVATE KEY-----"
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
\`\`\`

### Need More Help?

If you're still experiencing issues:
1. Check the browser console for specific error messages
2. Verify your service account has the correct permissions
3. Ensure your Google Sheet is shared with the service account email
4. Test the connection using the provided HEAD endpoint
