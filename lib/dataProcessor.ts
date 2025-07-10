// This file will contain pure data processing functions.
// We will move parseFileData and calculateFeatures here.

// Define AttendanceRecord interface here as it's used by the functions
// Or import it if it's defined in a shared types file.
// For now, let's define it here for simplicity if not already externalized.
export interface AttendanceRecord {
  NRP: string
  Nama: string
  Unit: string
  "Tanggal Absensi": string
  "Waktu Absensi": string
  Status: string
  "Jenis Absensi": string
  Latitude: string
  Longitude: string
  "Akurasi Lokasi": string
  "URL Foto": string
  "ID Perangkat": string
  "Alamat IP": string
  Deskripsi: string
}

// We'll also need the FeatureSet interface for calculateFeatures' return type
// (atau tipe apa pun yang dikembalikan oleh calculateFeatures)
// Misalnya, jika calculateFeatures mengembalikan objek dengan struktur tertentu:
export interface ProcessedFeatureSet {
  record: AttendanceRecord;
  nrp: string;
  total_hadir: number;
  total_terlambat: number;
  total_izin: number;
  total_masuk: number;
  avgArrivalTime: number;
  tardinessRate: number;
  rata2_akurasi_lokasi: number;
  jumlah_ip_berbeda: number;
  jumlah_perangkat_berbeda: number;
  features: number[]; // Array fitur numerik untuk clustering
}


// parseFileData implementation moved from dashboard.tsx
export function parseFileData(file: File): Promise<AttendanceRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    reader.onload = (event) => {
      try {
        const fileData = event.target?.result;
        if (!fileData) {
          reject(new Error("Tidak ada data file yang bisa dibaca."));
          return;
        }

        let parsedRecords: AttendanceRecord[] = [];

        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const XLSX = require('xlsx'); // Lazy load xlsx
          const workbook = XLSX.read(fileData, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length < 2) { // At least one header row and one data row
              resolve([]); return;
          }
          const headers = jsonData[0] as string[];
          parsedRecords = (jsonData.slice(1) as any[][]).map(row => {
              const record: any = {};
              headers.forEach((header, index) => {
                  record[header] = row[index] === undefined ? "" : String(row[index]);
              });
              return record as AttendanceRecord;
          });

        } else if (fileExtension === 'csv') {
          const textData = fileData as string;
          const lines = textData.trim().split(/\r\n|\n/);
          if (lines.length < 2) { // At least one header row and one data row
              resolve([]); return;
          }

          // Auto-detect delimiter (simple version: check common delimiters in header)
          const headerLine = lines[0];
          let delimiter = '\t'; // Default to tab
          if (headerLine.includes(',')) delimiter = ',';
          else if (headerLine.includes(';')) delimiter = ';';
          // Could add more robust detection if needed

          const headers = headerLine.split(delimiter).map(h => h.trim());

          parsedRecords = lines.slice(1).map(line => {
              const values = line.split(delimiter).map(v => v.trim());
              const record: any = {};
              headers.forEach((header, index) => {
                  record[header] = values[index] === undefined ? "" : values[index];
              });
              return record as AttendanceRecord;
          });
        } else {
          reject(new Error(`Format file tidak didukung: .${fileExtension}`));
          return;
        }
        resolve(parsedRecords);
      } catch (err) {
        console.error("Error parsing file:", err);
        reject(new Error("Gagal mem-parsing file. Pastikan formatnya benar."));
      }
    };

    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      reject(new Error("Gagal membaca file."));
    };

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      reader.readAsBinaryString(file);
    } else if (fileExtension === 'csv') {
      reader.readAsText(file);
    } else {
      reject(new Error(`Format file tidak didukung: .${fileExtension}`));
    }
  });
}

// calculateFeatures implementation moved from dashboard.tsx
export function calculateFeatures(records: AttendanceRecord[]): ProcessedFeatureSet[] {
    const masukRecords = records.filter(record => record["Jenis Absensi"] === "Masuk");
    if (masukRecords.length === 0) return [];

    const personelStats: { [key: string]: { total_hadir: number; total_terlambat: number; total_izin: number; total_masuk: number; waktu_masuk: number[]; akurasi_lokasi: number[]; ip_addresses: Set<string>; perangkat_ids: Set<string>; } } = {};

    masukRecords.forEach(record => {
        const nrp = record.NRP || "";
        if (!personelStats[nrp]) {
            personelStats[nrp] = { total_hadir: 0, total_terlambat: 0, total_izin: 0, total_masuk: 0, waktu_masuk: [], akurasi_lokasi: [], ip_addresses: new Set(), perangkat_ids: new Set() };
        }

        const stats = personelStats[nrp];
        stats.total_masuk += 1;

        if (record.Status === "Hadir" || record.Status === "Tepat Waktu") stats.total_hadir += 1;
        else if (record.Status === "Terlambat") stats.total_terlambat += 1;
        else if (record.Status === "Izin") stats.total_izin += 1;

        const waktuAbsensi = record["Waktu Absensi"];
        if (waktuAbsensi && typeof waktuAbsensi === 'string' && waktuAbsensi.includes(':')) {
            const timeParts = waktuAbsensi.split(":");
            const hours = parseInt(timeParts[0], 10);
            const minutesPart = parseInt(timeParts[1], 10); // Assuming format HH:MM
            if (!isNaN(hours) && !isNaN(minutesPart)) {
                stats.waktu_masuk.push(hours * 60 + minutesPart);
            }
        }

        const akurasiValue = record["Akurasi Lokasi"];
        if (akurasiValue) {
            // Bersihkan nilai akurasi: hapus " M" di akhir (case-insensitive) dan ganti koma dengan titik
            const akurasiStr = String(akurasiValue).replace(/\s*M$/i, '').replace(/,/g, '.');
            const akurasi = parseFloat(akurasiStr);
            if (!isNaN(akurasi) && akurasi > 0) {
                stats.akurasi_lokasi.push(akurasi);
            }
        }

        if (record["Alamat IP"]) stats.ip_addresses.add(record["Alamat IP"]);
        if (record["ID Perangkat"]) stats.perangkat_ids.add(record["ID Perangkat"]);
    });

    const features = Object.entries(personelStats).map(([nrp, stats]) => {
        const record = masukRecords.find(r => r.NRP === nrp)!; // Non-null assertion: aman jika nrp berasal dari personelStats yang dibangun dari masukRecords
        const avgArrivalTime = stats.waktu_masuk.length > 0 ? stats.waktu_masuk.reduce((a, b) => a + b, 0) / stats.waktu_masuk.length : 480; // Default 08:00
        const tardinessRate = stats.total_masuk > 0 ? (stats.total_terlambat / stats.total_masuk) * 100 : 0;

        const avgAccuracy = stats.akurasi_lokasi.length > 0 ? stats.akurasi_lokasi.reduce((a, b) => a + b, 0) / stats.akurasi_lokasi.length : 10; // Default 10 jika tidak ada data

        const featureSet: ProcessedFeatureSet = {
            record,
            nrp,
            total_hadir: stats.total_hadir,
            total_terlambat: stats.total_terlambat,
            total_izin: stats.total_izin,
            total_masuk: stats.total_masuk,
            avgArrivalTime: !isNaN(avgArrivalTime) ? avgArrivalTime : 480,
            tardinessRate: !isNaN(tardinessRate) ? tardinessRate : 0,
            rata2_akurasi_lokasi: !isNaN(avgAccuracy) ? avgAccuracy : 10,
            jumlah_ip_berbeda: stats.ip_addresses.size,
            jumlah_perangkat_berbeda: stats.perangkat_ids.size,
            features: [
                stats.total_hadir,
                stats.total_terlambat,
                !isNaN(avgAccuracy) ? avgAccuracy : 10,
                stats.ip_addresses.size,
                stats.perangkat_ids.size
            ].map(val => !isNaN(val) ? val : 0)
        };
        return featureSet;
    });

    return features;
}
