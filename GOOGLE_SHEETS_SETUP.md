# Google Sheets Integration Setup

## Environment Variables

Your application uses these specific environment variable names:

- `GOOGLE_SHEETS_CLIENT_EMAIL`
- `GOOGLE_SHEETS_PRIVATE_KEY` 
- `GOOGLE_SHEETS_ID`

## API Endpoints

### 1. `/api/sheets` - Main Data Operations

#### POST - Write/Upload Data
\`\`\`javascript
// Upload data to spreadsheet
fetch('/api/sheets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: [
      { NRP: '12345', Nama: 'John Doe', Unit: 'TIK' },
      // ... more records
    ],
    appendMode: true, // or false to replace
    sheetName: 'Current_Data' // optional, defaults to 'Current_Data'
  })
})
\`\`\`

#### GET - Read Data
\`\`\`javascript
// Read all data
fetch('/api/sheets')

// Read from specific sheet
fetch('/api/sheets?sheet=Backup_Data')

// Read with limit
fetch('/api/sheets?limit=100')

// Read specific range
fetch('/api/sheets?range=A1:E10')
\`\`\`

#### PUT - Update Range
\`\`\`javascript
// Update specific range
fetch('/api/sheets', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    range: 'A2:C2',
    values: ['12345', 'John Doe Updated', 'TIK'],
    sheetName: 'Current_Data'
  })
})
\`\`\`

#### DELETE - Clear Data or Delete Sheet
\`\`\`javascript
// Clear data range
fetch('/api/sheets?sheet=Current_Data&range=A2:Z100', {
  method: 'DELETE'
})

// Delete entire sheet
fetch('/api/sheets?sheet=Old_Data&deleteSheet=true', {
  method: 'DELETE'
})
\`\`\`

#### HEAD - Test Connection
\`\`\`javascript
// Test configuration and connection
fetch('/api/sheets', { method: 'HEAD' })
\`\`\`

### 2. `/api/data` - Individual Record Operations

#### POST - Add Single Record
\`\`\`javascript
fetch('/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    record: {
      NRP: '12345',
      Nama: 'John Doe',
      Unit: 'TIK',
      'Tanggal Absensi': '2024-01-15'
    },
    sheetName: 'Current_Data' // optional
  })
})
\`\`\`

#### GET - Get Specific Record
\`\`\`javascript
// Get specific row (0-based index)
fetch('/api/data?rowIndex=5&sheet=Current_Data')

// Get range
fetch('/api/data?range=A1:E10&sheet=Current_Data')

// Get all data
fetch('/api/data?sheet=Current_Data')
\`\`\`

#### PUT - Update Single Record
\`\`\`javascript
fetch('/api/data', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rowIndex: 5, // 0-based row index
    record: {
      NRP: '12345',
      Nama: 'John Doe Updated',
      Unit: 'TIK'
    },
    sheetName: 'Current_Data'
  })
})
\`\`\`

#### DELETE - Delete Single Record
\`\`\`javascript
// Delete specific row (0-based index)
fetch('/api/data?rowIndex=5&sheet=Current_Data', {
  method: 'DELETE'
})
\`\`\`

## Features

### 1. **Automatic Sheet Management**
- Creates sheets if they don't exist
- Handles sheet metadata and structure

### 2. **Duplicate Prevention**
- In append mode, checks for duplicates based on key columns
- Skips duplicate records and reports counts

### 3. **Data Type Handling**
- Properly handles different data types (strings, numbers, objects)
- Converts objects to JSON strings for storage
- Parses JSON strings back to objects when reading

### 4. **Backup Creation**
- Automatically creates timestamped backup sheets
- Preserves data history

### 5. **Error Handling**
- Comprehensive error messages
- Validation of environment variables
- Connection testing

### 6. **Flexible Querying**
- Support for specific ranges
- Row-based operations
- Sheet selection
- Data limiting

## Usage Examples

### Reading Data
\`\`\`javascript
// Get all attendance data
const response = await fetch('/api/sheets')
const { data, metadata } = await response.json()

console.log(`Found ${metadata.recordCount} records`)
console.log('Headers:', metadata.headers)
\`\`\`

### Writing Data
\`\`\`javascript
// Upload attendance data
const attendanceData = [
  {
    NRP: '12345',
    Nama: 'John Doe',
    Unit: 'TIK',
    'Tanggal Absensi': '2024-01-15',
    'Jam Masuk': '08:00',
    Status: 'Masuk'
  }
]

const response = await fetch('/api/sheets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: attendanceData,
    appendMode: true
  })
})

const result = await response.json()
console.log(result.message)
\`\`\`

### Individual Record Operations
\`\`\`javascript
// Add single record
await fetch('/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    record: {
      NRP: '67890',
      Nama: 'Jane Smith',
      Unit: 'HUMAS'
    }
  })
})

// Update record at row 10
await fetch('/api/data', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rowIndex: 10,
    record: { Status: 'Updated' }
  })
})
\`\`\`

## Error Handling

All endpoints return consistent error formats:

\`\`\`javascript
{
  "error": "Error description",
  "details": "Detailed error message"
}
\`\`\`

Common errors:
- Missing environment variables
- Invalid spreadsheet ID
- Permission denied
- Sheet not found
- Invalid data format

## Security Notes

- Environment variables are validated on each request
- Spreadsheet ID is partially masked in responses
- Service account permissions should be minimal (only Sheets access)
- Private keys are properly formatted with newlines
