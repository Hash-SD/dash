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

// GET - Get specific record or range
export async function GET(request: NextRequest) {
  try {
    const { sheets, sheetsId } = await createSheetsClient()

    const url = new URL(request.url)
    const row = url.searchParams.get("row")
    const range = url.searchParams.get("range") || "Sheet1"
    const nrp = url.searchParams.get("nrp")

    if (row) {
      // Get specific row
      const rowNumber = Number.parseInt(row)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsId,
        range: `${range}!${rowNumber}:${rowNumber}`,
      })

      const rowData = response.data.values?.[0] || []

      // Get headers
      const headersResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsId,
        range: `${range}!1:1`,
      })

      const headers = headersResponse.data.values?.[0] || []

      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = rowData[index] || ""
      })

      return NextResponse.json({ data: record })
    }

    if (nrp) {
      // Search by NRP
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetsId,
        range: range,
      })

      const rows = response.data.values || []
      if (rows.length === 0) {
        return NextResponse.json({ data: null, message: "No data found" })
      }

      const headers = rows[0]
      const dataRows = rows.slice(1)

      const foundRecord = dataRows.find((row) => row[0] === nrp) // Assuming NRP is in first column

      if (!foundRecord) {
        return NextResponse.json({ data: null, message: "Record not found" })
      }

      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = foundRecord[index] || ""
      })

      return NextResponse.json({ data: record })
    }

    // Default: return all data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsId,
      range: range,
    })

    const rows = response.data.values || []

    if (rows.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)

    const data = dataRows.map((row) => {
      const record: any = {}
      headers.forEach((header, index) => {
        record[header] = row[index] || ""
      })
      return record
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error reading data:", error)
    return NextResponse.json(
      {
        error: "Failed to read data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST - Add single record
export async function POST(request: NextRequest) {
  try {
    const { sheets, sheetsId } = await createSheetsClient()
    const body = await request.json()

    const { record, range = "Sheet1" } = body

    if (!record || typeof record !== "object") {
      return NextResponse.json({ error: "No record provided or record is not an object" }, { status: 400 })
    }

    // Get existing headers
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsId,
      range: `${range}!1:1`,
    })

    let headers = headersResponse.data.values?.[0] || []

    // If no headers exist, create them from the record
    if (headers.length === 0) {
      headers = Object.keys(record)
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetsId,
        range: `${range}!1:1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      })
    }

    // Prepare record data
    const values = [
      headers.map((header) => {
        const value = record[header]
        return typeof value === "object" ? JSON.stringify(value) : value || ""
      }),
    ]

    // Append the record
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetsId,
      range: range,
      valueInputOption: "RAW",
      requestBody: { values },
    })

    return NextResponse.json({
      message: "Record added successfully",
      record: record,
    })
  } catch (error) {
    console.error("Error adding record:", error)
    return NextResponse.json(
      {
        error: "Failed to add record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// PUT - Update specific record
export async function PUT(request: NextRequest) {
  try {
    const { sheets, sheetsId } = await createSheetsClient()
    const body = await request.json()

    const { record, row, range = "Sheet1" } = body

    if (!record || typeof record !== "object") {
      return NextResponse.json({ error: "No record provided or record is not an object" }, { status: 400 })
    }

    if (!row || isNaN(Number.parseInt(row))) {
      return NextResponse.json({ error: "Valid row number is required" }, { status: 400 })
    }

    const rowNumber = Number.parseInt(row)

    // Get headers
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetsId,
      range: `${range}!1:1`,
    })

    const headers = headersResponse.data.values?.[0] || []

    if (headers.length === 0) {
      return NextResponse.json({ error: "No headers found in spreadsheet" }, { status: 400 })
    }

    // Prepare record data
    const values = [
      headers.map((header) => {
        const value = record[header]
        return typeof value === "object" ? JSON.stringify(value) : value || ""
      }),
    ]

    // Update the specific row
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetsId,
      range: `${range}!${rowNumber}:${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values },
    })

    return NextResponse.json({
      message: `Record at row ${rowNumber} updated successfully`,
      record: record,
    })
  } catch (error) {
    console.error("Error updating record:", error)
    return NextResponse.json(
      {
        error: "Failed to update record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE - Delete specific record
export async function DELETE(request: NextRequest) {
  try {
    const { sheets, sheetsId } = await createSheetsClient()

    const url = new URL(request.url)
    const row = url.searchParams.get("row")
    const range = url.searchParams.get("range") || "Sheet1"

    if (!row || isNaN(Number.parseInt(row))) {
      return NextResponse.json({ error: "Valid row number is required" }, { status: 400 })
    }

    const rowNumber = Number.parseInt(row)

    // Clear the specific row
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetsId,
      range: `${range}!${rowNumber}:${rowNumber}`,
    })

    return NextResponse.json({
      message: `Record at row ${rowNumber} deleted successfully`,
      row: rowNumber,
    })
  } catch (error) {
    console.error("Error deleting record:", error)
    return NextResponse.json(
      {
        error: "Failed to delete record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
