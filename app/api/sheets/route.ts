import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

// Formats the private key string by removing quotes and converting literal newlines.
function formatPrivateKey(privateKey: string): string {
  if (!privateKey) {
    throw new Error("Private key is empty or undefined")
  }

  let key = privateKey.trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1)
  }

  key = key.replace(/\\n/g, "\n")

  if (!key.includes("-----BEGIN PRIVATE KEY-----") || !key.includes("-----END PRIVATE KEY-----")) {
    throw new Error("Invalid private key format: missing BEGIN or END marker")
  }
  return key
}

// Validates that necessary Google Sheets environment variables are set.
function validateEnvironmentVariables() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY
  const sheetsId = process.env.GOOGLE_SHEETS_ID

  if (!clientEmail) {
    throw new Error("GOOGLE_SHEETS_CLIENT_EMAIL environment variable is not set")
  }
  if (!privateKey) {
    throw new Error("GOOGLE_SHEETS_PRIVATE_KEY environment variable is not set")
  }
  if (!sheetsId) {
    throw new Error("GOOGLE_SHEETS_ID environment variable is not set")
  }

  return { clientEmail, privateKey, sheetsId }
}

// Creates and configures the Google Sheets API client.
async function createSheetsClient() {
  try {
    const { clientEmail, privateKey, sheetsId } = validateEnvironmentVariables()

    const formattedPrivateKey = formatPrivateKey(privateKey)

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: formattedPrivateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    return { sheets, sheetsId }
  } catch (error) {
    console.error("Error creating Google Sheets client:", error)
    throw error
  }
}

// Handles GET requests to read data from Google Sheets.
export async function GET(request: NextRequest) {
  try {
    const { sheets, sheetsId } = await createSheetsClient()

    const url = new URL(request.url)
    const range = url.searchParams.get("range") || "Sheet1"
    const limit = url.searchParams.get("limit")

    console.log(`Reading from Google Sheets - Range: ${range}`)

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsId,
      range: range,
    })

    const rows = response.data.values || []

    if (rows.length === 0) {
      return NextResponse.json({
        data: [],
        message: "No data found in the spreadsheet",
        range: range,
      })
    }

    const headers = rows[0] || []
    const dataRows = rows.slice(1)

    let data = dataRows
      .map((row) => { // Convert rows to objects
        const record: any = {}
        headers.forEach((header, colIndex) => {
          record[header] = row[colIndex] || ""
        })
        return record
      })
      .filter((record) => // Filter out completely empty records
        Object.values(record).some((value) => value && value.toString().trim() !== "")
      )

    if (limit && !isNaN(Number.parseInt(limit))) { // Apply limit if specified
      data = data.slice(0, Number.parseInt(limit))
    }

    console.log(`Successfully read ${data.length} records from Google Sheets`)

    return NextResponse.json({
      data,
      message: `Successfully loaded ${data.length} records from Google Sheets`,
      range: range,
      totalRows: dataRows.length,
    })
  } catch (error) {
    console.error("Error reading from Google Sheets:", error)
    return NextResponse.json(
      {
        error: "Failed to read from Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
        data: [],
      },
      { status: 500 },
    )
  }
}

// Handles POST requests to write data to Google Sheets.
// Supports append and replace modes.
export async function POST(request: NextRequest) {
  try {
    const { sheets, sheetsId } = await createSheetsClient()
    const body = await request.json()

    const { data, fileName, appendMode = true, range = "Sheet1" } = body

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No data provided or data is not an array" }, { status: 400 })
    }

    console.log(`Writing ${data.length} records to Google Sheets - Append mode: ${appendMode}`)

    const headers = Object.keys(data[0]) // Get headers from the first data item

    if (!appendMode) {
      // Replace mode: Clear existing data and write new data
      console.log("Clearing existing data...")
      await sheets.spreadsheets.values.clear({ spreadsheetId: sheetsId, range: range })

      const values = [
        headers,
        ...data.map((record) =>
          headers.map((header) => {
            const value = record[header]
            return typeof value === "object" ? JSON.stringify(value) : value || ""
          }),
        ),
      ]
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetsId,
        range: `${range}!A1`,
        valueInputOption: "RAW",
        requestBody: { values },
      })
      return NextResponse.json({
        message: `Successfully replaced all data with ${data.length} records`,
        recordsWritten: data.length,
        mode: "replace",
      })
    } else {
      // Append mode: Add new data, skip duplicates
      const existingResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsId,
        range: range,
      })
      const existingRows = existingResponse.data.values || []
      let existingHeaders: string[] = []
      let existingData: any[] = []

      if (existingRows.length > 0) {
        existingHeaders = existingRows[0] || []
        existingData = existingRows.slice(1).map((row) => {
          const record: any = {}
          existingHeaders.forEach((header, index) => {
            record[header] = row[index] || ""
          })
          return record
        })
      }

      // Deduplication based on NRP and Tanggal Absensi
      const existingKeys = new Set(
        existingData.map((record) => `${record.NRP || ""}_${record["Tanggal Absensi"] || ""}`)
      )
      const newData = data.filter((record) => {
        const key = `${record.NRP || ""}_${record["Tanggal Absensi"] || ""}`
        return !existingKeys.has(key)
      })

      if (newData.length === 0) {
        return NextResponse.json({
          message: "No new records to add (all records already exist)",
          recordsWritten: 0,
          duplicatesSkipped: data.length,
          mode: "append",
        })
      }

      const valuesToAppend = newData.map((record) =>
        headers.map((header) => {
          const value = record[header]
          return typeof value === "object" ? JSON.stringify(value) : value || ""
        }),
      )

      if (existingRows.length === 0) {
        // If sheet is empty, write headers along with data
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetsId,
          range: `${range}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [headers, ...valuesToAppend] },
        })
      } else {
        // Append new data only
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetsId,
          range: range,
          valueInputOption: "RAW",
          requestBody: { values: valuesToAppend },
        })
      }

      return NextResponse.json({
        message: `Successfully added ${newData.length} new records`,
        recordsWritten: newData.length,
        duplicatesSkipped: data.length - newData.length,
        mode: "append",
      })
    }
  } catch (error) {
    console.error("Error writing to Google Sheets:", error)
    return NextResponse.json(
      {
        error: "Failed to write to Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Handles HEAD requests to test the connection to Google Sheets.
export async function HEAD() {
  try {
    const { sheets, sheetsId } = await createSheetsClient()
    // Test connection by attempting to get spreadsheet metadata
    await sheets.spreadsheets.get({ spreadsheetId: sheetsId })
    return new NextResponse(null, {
      status: 200,
      headers: {
        "X-Connection-Status": "success",
        "X-Sheets-ID": sheetsId.substring(0, 8) + "...",
      },
    })
  } catch (error) {
    console.error("Connection test failed:", error)
    return new NextResponse(null, {
      status: 500,
      headers: {
        "X-Connection-Status": "failed",
        "X-Error": error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

// Handles DELETE requests to clear data from a specified range in Google Sheets.
export async function DELETE(request: NextRequest) {
  try {
    const { sheets, sheetsId } = await createSheetsClient()

    const url = new URL(request.url)
    const range = url.searchParams.get("range") || "Sheet1"

    console.log(`Clearing data from range: ${range}`)

    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetsId,
      range: range,
    })

    return NextResponse.json({
      message: `Successfully cleared data from ${range}`,
      range: range,
    })
  } catch (error) {
    console.error("Error clearing Google Sheets data:", error)
    return NextResponse.json(
      {
        error: "Failed to clear Google Sheets data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
