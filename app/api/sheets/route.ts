import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

// Function to properly format the private key
function formatPrivateKey(privateKey: string): string {
  if (!privateKey) {
    throw new Error("Private key is empty or undefined")
  }

  // Remove surrounding quotes if present
  let key = privateKey.trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1)
  }

  // Convert literal \n to actual newlines
  key = key.replace(/\\n/g, "\n")

  // Ensure proper formatting
  if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("Invalid private key format: missing BEGIN marker")
  }
  if (!key.includes("-----END PRIVATE KEY-----")) {
    throw new Error("Invalid private key format: missing END marker")
  }

  return key
}

// Function to validate environment variables
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

// Function to create Google Sheets client
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

// GET - Read data from Google Sheets
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

    // First row contains headers
    const headers = rows[0] || []
    const dataRows = rows.slice(1)

    // Convert rows to objects
    let data = dataRows
      .map((row, index) => {
        const record: any = {}
        headers.forEach((header, colIndex) => {
          record[header] = row[colIndex] || ""
        })
        return record
      })
      .filter((record) => {
        // Filter out completely empty records
        return Object.values(record).some((value) => value && value.toString().trim() !== "")
      })

    // Apply limit if specified
    if (limit && !isNaN(Number.parseInt(limit))) {
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

// POST - Write data to Google Sheets
export async function POST(request: NextRequest) {
  try {
    const { sheets, sheetsId } = await createSheetsClient()
    const body = await request.json()

    const { data, fileName, appendMode = true, range = "Sheet1" } = body

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No data provided or data is not an array" }, { status: 400 })
    }

    console.log(`Writing ${data.length} records to Google Sheets - Append mode: ${appendMode}`)

    // Get headers from the first data item
    const headers = Object.keys(data[0])

    if (!appendMode) {
      // Replace mode - clear existing data and write new data
      console.log("Clearing existing data...")

      // Clear the sheet first
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetsId,
        range: range,
      })

      // Prepare data with headers
      const values = [
        headers,
        ...data.map((record) =>
          headers.map((header) => {
            const value = record[header]
            return typeof value === "object" ? JSON.stringify(value) : value || ""
          }),
        ),
      ]

      // Write all data
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
      // Append mode - add new data, skip duplicates

      // First, read existing data to check for duplicates
      const existingResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsId,
        range: range,
      })

      const existingRows = existingResponse.data.values || []
      let existingHeaders: string[] = []
      let existingData: any[] = []

      if (existingRows.length > 0) {
        existingHeaders = existingRows[0] || []
        const existingDataRows = existingRows.slice(1)

        existingData = existingDataRows.map((row) => {
          const record: any = {}
          existingHeaders.forEach((header, index) => {
            record[header] = row[index] || ""
          })
          return record
        })
      }

      // Check for duplicates based on NRP and Tanggal Absensi
      const existingKeys = new Set(
        existingData.map((record) => `${record.NRP || ""}_${record["Tanggal Absensi"] || ""}`),
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

      // If sheet is empty, write headers first
      if (existingRows.length === 0) {
        const values = [
          headers,
          ...newData.map((record) =>
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
      } else {
        // Append new data only
        const values = newData.map((record) =>
          headers.map((header) => {
            const value = record[header]
            return typeof value === "object" ? JSON.stringify(value) : value || ""
          }),
        )

        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetsId,
          range: range,
          valueInputOption: "RAW",
          requestBody: { values },
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

// HEAD - Test connection
export async function HEAD() {
  try {
    const { sheets, sheetsId } = await createSheetsClient()

    // Test connection by getting spreadsheet metadata
    await sheets.spreadsheets.get({
      spreadsheetId: sheetsId,
    })

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

// DELETE - Clear data
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
