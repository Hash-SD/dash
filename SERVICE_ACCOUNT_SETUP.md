# Google Sheets Service Account Setup

This guide will walk you through the process of setting up a Google Service Account and configuring your Google Sheet to allow your dashboard to read and write data. This setup is designed to coexist with any existing API connections you might have to your spreadsheet.

## Step 1: Create or Select a Google Cloud Project

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  At the top of the page, click on the project dropdown (next to "Google Cloud").
3.  Select an existing project or click "New Project" to create a new one. Give your project a descriptive name and click "Create".

## Step 2: Enable the Google Sheets API

1.  Once your project is selected, in the left-hand navigation bar, go to **APIs & Services > Enabled APIs & Services**.
2.  Click "+ ENABLE APIS AND SERVICES" at the top.
3.  Search for "Google Sheets API" and click on it.
4.  Click "ENABLE".

## Step 3: Create a Service Account

1.  In the left-hand navigation bar, go to **APIs & Services > Credentials**.
2.  Click "+ CREATE CREDENTIALS" at the top, then select "Service Account".
3.  **Service account name**: Enter a descriptive name (e.g., `sheets-dashboard-service`).
4.  **Service account ID**: This will be automatically generated.
5.  Click "CREATE AND CONTINUE".
6.  **Grant this service account access to project**:
    *   Click the "Select a role" dropdown.
    *   In the search box, type **"Google Sheets Editor"**. Select this role from the list that appears.
        *   *Note*: If you only want the service account to be able to read data (not write), search for and select **"Google Sheets Viewer"** instead.
    *   Click "CONTINUE".
7.  **Grant users access to this service account**: You can skip this step or add users if necessary.
8.  Click "DONE".

## Step 4: Generate a JSON Key for the Service Account

1.  After the service account is created, you will see it listed under "Service Accounts" on the **Credentials** page.
2.  Click on the name of the service account you just created.
3.  Select the "KEYS" tab.
4.  Click "ADD KEY", then choose "Create new key".
5.  Select "JSON" as the key type and click "CREATE".
6.  A JSON file will be downloaded to your computer. **Keep this file secure**, as it contains your private key.

## Step 5: Extract Credentials from the JSON File

Open the JSON file you just downloaded with a text editor. You will find the following information:

*   **`GOOGLE_SHEETS_CLIENT_EMAIL`**: This is the value of the `client_email` key in the JSON file.
    *   Example: `"your-service-account@your-project-id.iam.gserviceaccount.com"`
*   **`GOOGLE_SHEETS_PRIVATE_KEY`**: This is the value of the `private_key` key in the JSON file.
    *   **Important**: This value will contain `\n` characters for newlines. When you copy it to your environment variable, ensure you wrap it in quotes and preserve these `\n` characters (do not replace them with actual newlines in your `.env` file).
    *   Example: `"-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n"`

## Step 6: Get Your `GOOGLE_SHEETS_ID`

1.  Open the Google Sheet you intend to use for your dashboard.
2.  Look at the spreadsheet's URL in your browser. The spreadsheet ID is the part between `/d/` and `/edit` (or `/htmlview`).
    *   Example URL: `https://docs.google.com/spreadsheets/d/1ABCDEFG12345HIJKLMN/edit#gid=0`
    *   Your `GOOGLE_SHEETS_ID` is: `1ABCDEFG12345HIJKLMN`

## Step 7: Share Your Google Sheet with the Service Account

This is a crucial step to grant your service account permission to access your specific Google Sheet. This will **not** interfere with any existing API connections to the sheet, as you are simply adding another authorized entity.

1.  In your Google Sheet, click the "Share" button in the top-right corner.
2.  In the "Add people and groups" field, paste the `GOOGLE_SHEETS_CLIENT_EMAIL` you obtained in Step 5.
3.  Ensure the permission is set to **"Editor"** (or "Viewer" if you chose that role in Step 3) so the service account can read and write data.
4.  **Crucially, uncheck the "Notify people" checkbox** to avoid sending an email to the service account.
5.  Click "Share" or "Done".

## Step 8: Configure Environment Variables in Your Project

Finally, add these values to your project's environment variables. If you are running locally, create a `.env.local` file in your project root. If deploying to Vercel, add them directly in your project settings.

\`\`\`env
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_ID=your_google_sheets_id_here
\`\`\`

By following these steps, your dashboard will be able to securely read and write data to your existing Google Sheet using the new service account, without affecting any other APIs connected to it.
