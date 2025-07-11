import { type NextRequest, NextResponse } from 'next/server';
import { google, sheets_v4 } from 'googleapis'; // sheets_v4 diimpor untuk tipe
import { JWT } from 'google-auth-library';

// Konfigurasi Spreadsheet
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const DEFAULT_SHEET_NAME = 'data-absensi'; // Nama sheet default

// Fungsi utilitas untuk memformat kunci privat dari variabel lingkungan
function getFormattedPrivateKey(): string {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("GOOGLE_PRIVATE_KEY environment variable is not set.");
  }
  return privateKey.replace(/\\n/g, '\n');
}

// Fungsi untuk membuat klien Google Sheets yang diautentikasi
async function createSheetsClient(): Promise<sheets_v4.Sheets> {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = getFormattedPrivateKey();

  if (!clientEmail) {
    throw new Error("GOOGLE_CLIENT_EMAIL environment variable is not set.");
  }
  if (!SPREADSHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID environment variable is not set.");
  }

  const client = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth: client });
}

// Helper function untuk mengubah array baris menjadi array objek
function rowsToObjects(headers: string[], dataRows: any[][]): Record<string, any>[] {
  return dataRows.map((row) => {
    const record: Record<string, any> = {};
    headers.forEach((header, colIndex) => {
      record[header] = row[colIndex] !== undefined && row[colIndex] !== null ? String(row[colIndex]) : "";
    });
    return record;
  }).filter(record => // Filter out completely empty records
    Object.values(record).some(value => value && String(value).trim() !== "")
  );
}

// Handler untuk metode GET (sudah diimplementasikan sebelumnya)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rowParam = searchParams.get('row');
  const nrpParam = searchParams.get('nrp');
  const rangeParam = searchParams.get('range') || DEFAULT_SHEET_NAME;
  const limitParam = searchParams.get('limit');

  try {
    const sheets = await createSheetsClient();
    const currentSheetName = rangeParam.split('!')[0] || DEFAULT_SHEET_NAME; // Ekstrak nama sheet dari range jika ada

    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${currentSheetName}!1:1`,
    });
    const headers = headerResponse.data.values?.[0] as string[];
    if (!headers || headers.length === 0) {
      return NextResponse.json({ data: [], message: "No headers found in the sheet." }, { status: 404 });
    }

    if (rowParam) {
      const rowNumber = parseInt(rowParam, 10);
      if (isNaN(rowNumber) || rowNumber <= 1) {
        return NextResponse.json({ error: "Invalid row number provided. Must be greater than 1." }, { status: 400 });
      }
      const singleRowRange = `${currentSheetName}!${rowNumber}:${rowNumber}`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: singleRowRange,
      });
      const rowDataValues = response.data.values;
      if (!rowDataValues || rowDataValues.length === 0) {
        return NextResponse.json({ data: null, message: `No data found at row ${rowNumber}.` }, { status: 404 });
      }
      const [record] = rowsToObjects(headers, rowDataValues);
      return NextResponse.json({ data: record });
    }

    const dataRange = `${currentSheetName}!A2:${String.fromCharCode(65 + headers.length - 1)}`;
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: dataRange,
    });
    const dataRows = allDataResponse.data.values as any[][] || [];

    if (nrpParam) {
      const nrpColumnIndex = headers.indexOf('NRP');
      if (nrpColumnIndex === -1) {
        return NextResponse.json({ error: "NRP column not found in sheet headers. Cannot search by NRP." }, { status: 400 });
      }
      const foundRows = dataRows.filter(row => row[nrpColumnIndex] === nrpParam);
      if (foundRows.length === 0) {
        return NextResponse.json({ data: null, message: `No record found with NRP ${nrpParam}.` }, { status: 404 });
      }
      const records = rowsToObjects(headers, foundRows);
      return NextResponse.json({ data: records });
    }

    let allRecords = rowsToObjects(headers, dataRows);
    if (limitParam && !isNaN(parseInt(limitParam, 10))) {
      allRecords = allRecords.slice(0, parseInt(limitParam, 10));
    }
    return NextResponse.json({
      data: allRecords,
      message: `Successfully loaded ${allRecords.length} records.`,
      totalAvailableRecords: dataRows.length
    });

  } catch (error) {
    console.error('Error in GET /api/records:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch data from Google Sheets', details: errorMessage }, { status: 500 });
  }
}

// Handler untuk metode POST
export async function POST(request: NextRequest) {
  try {
    const sheets = await createSheetsClient();
    const body = await request.json();

    // Cek apakah ini penambahan tunggal atau massal
    // `record` untuk tunggal (dari /api/data), `data` untuk massal (dari /api/sheets)
    const { record: singleRecord, data: multipleData, range: rangeParam = DEFAULT_SHEET_NAME, appendMode = true } = body;
    const currentSheetName = rangeParam.split('!')[0] || DEFAULT_SHEET_NAME;

    let dataToProcess: any[] = [];
    let isBulkOperation = false;

    if (multipleData && Array.isArray(multipleData)) {
      dataToProcess = multipleData;
      isBulkOperation = true;
    } else if (singleRecord && typeof singleRecord === 'object') {
      dataToProcess = [singleRecord];
      isBulkOperation = false; // Meskipun array, ini dianggap operasi tunggal dari perspektif /api/data
    } else {
      return NextResponse.json({ error: "Invalid payload. Expecting 'record' for single entry or 'data' (array) for bulk entries." }, { status: 400 });
    }

    if (dataToProcess.length === 0) {
      return NextResponse.json({ error: "No data provided to add." }, { status: 400 });
    }

    // Ambil header yang ada atau buat jika sheet kosong
    let headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${currentSheetName}!1:1`,
    });
    let headers = headerResponse.data.values?.[0] as string[] || [];

    if (headers.length === 0) { // Jika sheet kosong, gunakan kunci dari objek pertama sebagai header
        headers = Object.keys(dataToProcess[0]);
        if (headers.length === 0) {
            return NextResponse.json({ error: "Cannot determine headers for empty data." }, { status: 400 });
        }
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${currentSheetName}!A1`,
            valueInputOption: "USER_ENTERED", // atau RAW
            requestBody: { values: [headers] },
        });
    }

    const valuesToInsert = dataToProcess.map(item =>
      headers.map(header => {
        const value = item[header];
        return value !== undefined && value !== null ? String(value) : "";
      })
    );

    if (isBulkOperation) { // Logika dari /api/sheets POST
      if (!appendMode) { // Mode ganti (replace)
        console.log(`Replacing data in ${currentSheetName}...`);
        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${currentSheetName}!A2:${String.fromCharCode(65 + headers.length -1)}` }); // Hapus data saja, bukan header

        if (valuesToInsert.length > 0) {
            await sheets.spreadsheets.values.append({ // append ke sheet yang sudah ada header nya
                spreadsheetId: SPREADSHEET_ID,
                range: `${currentSheetName}!A2`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: valuesToInsert },
            });
        }
        return NextResponse.json({
          message: `Successfully replaced data with ${dataToProcess.length} records in ${currentSheetName}.`,
          recordsWritten: dataToProcess.length,
        });

      } else { // Mode tambah (append) dengan deduplikasi (khusus untuk bulk)
        const existingDataResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${currentSheetName}!A2:${String.fromCharCode(65 + headers.length -1)}`,
        });
        const existingDataRows = existingDataResponse.data.values as any[][] || [];
        const existingObjects = rowsToObjects(headers, existingDataRows);

        // Asumsi NRP dan Tanggal Absensi untuk deduplikasi. Sesuaikan jika perlu.
        const nrpHeader = 'NRP'; // TODO: Pastikan header ini ada dan benar
        const dateHeader = 'Tanggal Absensi'; // TODO: Pastikan header ini ada dan benar

        const existingKeys = new Set(
          existingObjects.map(obj => `${obj[nrpHeader] || ''}_${obj[dateHeader] || ''}`)
        );

        const newDataToInsert = dataToProcess.filter(item => {
          const key = `${item[nrpHeader] || ''}_${item[dateHeader] || ''}`;
          return !existingKeys.has(key);
        });

        if (newDataToInsert.length === 0) {
          return NextResponse.json({
            message: "No new records to add (all records already exist or match duplicates).",
            recordsWritten: 0,
            duplicatesSkipped: dataToProcess.length,
          });
        }
        const finalValuesToAppend = newDataToInsert.map(item =>
            headers.map(header => {
              const value = item[header];
              return value !== undefined && value !== null ? String(value) : "";
            })
        );

        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: currentSheetName, // Append ke seluruh sheet, Google Sheets akan menemukan baris kosong berikutnya
          valueInputOption: "USER_ENTERED",
          requestBody: { values: finalValuesToAppend },
        });
        return NextResponse.json({
          message: `Successfully appended ${newDataToInsert.length} new records to ${currentSheetName}.`,
          recordsWritten: newDataToInsert.length,
          duplicatesSkipped: dataToProcess.length - newDataToInsert.length,
        });
      }
    } else { // Logika dari /api/data POST (penambahan tunggal, selalu append)
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: currentSheetName,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: valuesToInsert }, // valuesToInsert akan berisi satu item
        });
        return NextResponse.json({
            message: `Successfully added 1 record to ${currentSheetName}.`,
            record: dataToProcess[0],
            recordsWritten: 1
        });
    }

  } catch (error) {
    console.error('Error in POST /api/records:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to add data to Google Sheets', details: errorMessage }, { status: 500 });
  }
}

// Handler untuk metode PUT (akan diimplementasikan)
export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rowParam = searchParams.get('row');
  const rangeParam = searchParams.get('range') || DEFAULT_SHEET_NAME;
  const currentSheetName = rangeParam.split('!')[0] || DEFAULT_SHEET_NAME;


  if (!rowParam) {
    return NextResponse.json({ error: 'Row ID (as query parameter ?row=) is required for PUT operation' }, { status: 400 });
  }
  const rowNumber = parseInt(rowParam, 10);
  if (isNaN(rowNumber) || rowNumber <= 1) { // Baris 1 adalah header
      return NextResponse.json({ error: "Invalid row number. Must be a number greater than 1." }, { status: 400 });
  }

  try {
    const sheets = await createSheetsClient();
    const body = await request.json();
    const { record } = body;

    if (!record || typeof record !== 'object') {
        return NextResponse.json({ error: "Request body must contain a 'record' object." }, { status: 400 });
    }

    const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${currentSheetName}!1:1`,
    });
    const headers = headerResponse.data.values?.[0] as string[];
    if (!headers || headers.length === 0) {
        return NextResponse.json({ error: `No headers found in sheet '${currentSheetName}'. Cannot update.` }, { status: 404 });
    }

    const valuesToUpdate = [headers.map(header => {
        const value = record[header];
        return value !== undefined && value !== null ? String(value) : "";
    })];

    const updateRange = `${currentSheetName}!A${rowNumber}:${String.fromCharCode(65 + headers.length - 1)}${rowNumber}`;
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: valuesToUpdate },
    });

    return NextResponse.json({
        message: `Record at row ${rowNumber} in ${currentSheetName} updated successfully.`,
        updatedRecord: record
    });

  } catch (error) {
    console.error(`Error in PUT /api/records?row=${rowParam}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to update data in Google Sheets', details: errorMessage }, { status: 500 });
  }
}

// Handler untuk metode DELETE
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rowParam = searchParams.get('row');
  const rangeParam = searchParams.get('range'); // Untuk menghapus seluruh rentang data (misal 'data-absensi!A2:Z')
  const sheetNameToClear = searchParams.get('clearSheet'); // Untuk menghapus semua data dari satu sheet (misal 'data-absensi')

  try {
    const sheets = await createSheetsClient();

    if (rowParam) { // Menghapus satu baris spesifik
      const currentSheetName = searchParams.get('sheetName') || DEFAULT_SHEET_NAME; // Membutuhkan nama sheet untuk menghapus baris
      const rowNumber = parseInt(rowParam, 10);
      if (isNaN(rowNumber) || rowNumber <= 1) {
        return NextResponse.json({ error: "Invalid row number. Must be a number greater than 1." }, { status: 400 });
      }

      // Untuk menghapus baris, kita menggunakan batchUpdate dengan deleteDimension request
      // Ini lebih aman daripada hanya membersihkan nilai karena benar-benar menghapus barisnya
      const sheetId = await getSheetIdByName(sheets, currentSheetName);
      if (sheetId === null) {
          return NextResponse.json({ error: `Sheet with name '${currentSheetName}' not found.`}, { status: 404});
      }

      await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
              requests: [{
                  deleteDimension: {
                      range: {
                          sheetId: sheetId,
                          dimension: "ROWS",
                          startIndex: rowNumber - 1, // Google Sheets API is 0-indexed
                          endIndex: rowNumber
                      }
                  }
              }]
          }
      });
      return NextResponse.json({ message: `Row ${rowNumber} deleted successfully from ${currentSheetName}.` });

    } else if (rangeParam) { // Menghapus data dalam rentang tertentu (misalnya 'Sheet1!A2:Z100')
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: rangeParam,
      });
      return NextResponse.json({ message: `Data cleared successfully from range ${rangeParam}.` });

    } else if (sheetNameToClear) { // Menghapus semua data dari satu sheet (kecuali header)
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetNameToClear}!1:1`,
        });
        const headers = headerResponse.data.values?.[0] as string[];
        if (!headers || headers.length === 0) {
            return NextResponse.json({ message: `Sheet '${sheetNameToClear}' is already empty or has no headers.` });
        }
        const clearRange = `${sheetNameToClear}!A2:${String.fromCharCode(65 + headers.length - 1)}`;
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: clearRange,
        });
        return NextResponse.json({ message: `All data (except headers) cleared successfully from sheet ${sheetNameToClear}.` });
    } else {
      return NextResponse.json({ error: 'Either row ID (?row=), a range (?range=Sheet1!A2:Z), or a sheet name to clear (?clearSheet=Sheet1) is required for DELETE operation' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/records:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to delete data from Google Sheets', details: errorMessage }, { status: 500 });
  }
}

// Helper function untuk mendapatkan ID sheet berdasarkan namanya
async function getSheetIdByName(sheets: sheets_v4.Sheets, sheetName: string): Promise<number | null> {
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
    });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId || null;
}
