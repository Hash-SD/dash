# Environment Variables Setup

## Required Environment Variables

### Google Sheets Integration

1. **GOOGLE_CLIENT_EMAIL**
   - Description: Service account email from Google Cloud Console
   - Format: `your-service-account@your-project.iam.gserviceaccount.com`
   - How to get:
     1. Go to [Google Cloud Console](https://console.cloud.google.com/)
     2. Create or select a project
     3. Enable Google Sheets API
     4. Create a Service Account
     5. Download the JSON key file
     6. Use the `client_email` field

2. **GOOGLE_PRIVATE_KEY**
   - Description: Private key from the service account JSON file
   - Format: `"-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"`
   - How to get:
     1. From the same JSON key file
     2. Use the `private_key` field
     3. Keep the quotes and newline characters

3. **GOOGLE_SHEETS_ID**
   - Description: The ID of your Google Spreadsheet
   - Format: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
   - How to get:
     1. Open your Google Spreadsheet
     2. Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

## Setup Instructions

### 1. Create Google Cloud Project
\`\`\`bash
# Go to Google Cloud Console
# Create new project or select existing one
# Enable Google Sheets API
\`\`\`

### 2. Create Service Account
\`\`\`bash
# In Google Cloud Console:
# IAM & Admin > Service Accounts > Create Service Account
# Give it a name and description
# Grant "Editor" role (or custom role with Sheets access)
# Create and download JSON key
\`\`\`

### 3. Share Spreadsheet
\`\`\`bash
# Open your Google Spreadsheet
# Click "Share" button
# Add the service account email with "Editor" permissions
\`\`\`

### 4. Set Environment Variables

#### For Development (.env.local)
\`\`\`env
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID=your_google_sheets_id_here
\`\`\`

#### For Production (Vercel)
\`\`\`bash
# In Vercel Dashboard:
# Project Settings > Environment Variables
# Add each variable with the same names and values
\`\`\`

## Validation

The application will validate these environment variables on startup and provide clear error messages if any are missing or invalid.

## Security Notes

- Never commit `.env.local` or actual environment variables to version control
- Use `.env.example` as a template
- In production, use secure environment variable management
- Regularly rotate service account keys
- Use least-privilege access (only necessary Google Sheets permissions)

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Check that all three variables are set
   - Verify variable names match exactly

2. **"Authentication failed"**
   - Verify service account email is correct
   - Check that private key includes proper formatting with newlines
   - Ensure service account has access to the spreadsheet

3. **"Spreadsheet not found"**
   - Verify the Google Sheets ID is correct
   - Ensure the spreadsheet is shared with the service account email
   - Check that the spreadsheet exists and is accessible

4. **"Permission denied"**
   - Make sure the service account has "Editor" permissions on the spreadsheet
   - Verify Google Sheets API is enabled in Google Cloud Console
