// Contains pure data processing functions for attendance records.

// Defines the structure for an attendance record.
// Consider moving to a shared types file if used across multiple modules.
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

// Defines the structure for the output of the calculateFeatures function.
export interface ProcessedFeatureSet {
  record: AttendanceRecord; // The original record (or a representative one for a user)
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
  features: number[]; // Numeric features for clustering
}

// Parses attendance data from a file (XLSX, XLS, or CSV).
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
          const XLSX = require('xlsx'); // Lazy load xlsx for these formats
          const workbook = XLSX.read(fileData, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length < 2) { // Expect at least header and one data row
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
          if (lines.length < 2) { // Expect at least header and one data row
              resolve([]); return;
          }

          // Simple delimiter auto-detection (checks common ones in header)
          const headerLine = lines[0];
          let delimiter = '\t'; // Default to tab
          if (headerLine.includes(',')) delimiter = ',';
          else if (headerLine.includes(';')) delimiter = ';';

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

// Calculates features for each personnel based on their attendance records.
// Primarily processes "Masuk" (entry) records.
export function calculateFeatures(records: AttendanceRecord[]): ProcessedFeatureSet[] {
    const masukRecords = records.filter(record => record["Jenis Absensi"] === "Masuk");
    if (masukRecords.length === 0) return [];

    // Aggregate statistics per personnel (NRP)
    const personelStats: {
        [key: string]: {
            total_hadir: number;
            total_terlambat: number;
            total_izin: number;
            total_masuk: number;
            waktu_masuk: number[]; // Arrival times in minutes from midnight
            akurasi_lokasi: number[];
            ip_addresses: Set<string>;
            perangkat_ids: Set<string>;
        }
    } = {};

    masukRecords.forEach(record => {
        const nrp = record.NRP || "UNKNOWN_NRP"; // Handle potential missing NRP
        if (!personelStats[nrp]) {
            personelStats[nrp] = {
                total_hadir: 0, total_terlambat: 0, total_izin: 0, total_masuk: 0,
                waktu_masuk: [], akurasi_lokasi: [],
                ip_addresses: new Set(), perangkat_ids: new Set()
            };
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
            const minutes = parseInt(timeParts[1], 10); // Assuming HH:MM format
            if (!isNaN(hours) && !isNaN(minutes)) {
                stats.waktu_masuk.push(hours * 60 + minutes);
            }
        }

        const akurasiValue = record["Akurasi Lokasi"];
        if (akurasiValue) {
            // Clean accuracy value: remove " M" suffix (case-insensitive) and replace comma with dot
            const akurasiStr = String(akurasiValue).replace(/\s*M$/i, '').replace(/,/g, '.');
            const akurasi = parseFloat(akurasiStr);
            if (!isNaN(akurasi) && akurasi > 0) { // Ensure positive accuracy
                stats.akurasi_lokasi.push(akurasi);
            }
        }

        if (record["Alamat IP"]) stats.ip_addresses.add(record["Alamat IP"]);
        if (record["ID Perangkat"]) stats.perangkat_ids.add(record["ID Perangkat"]);
    });

    // Transform aggregated stats into feature sets
    const features = Object.entries(personelStats).map(([nrp, stats]) => {
        const representativeRecord = masukRecords.find(r => r.NRP === nrp) || masukRecords[0]; // Fallback if NRP was UNKNOWN
        const avgArrivalTime = stats.waktu_masuk.length > 0
            ? stats.waktu_masuk.reduce((a, b) => a + b, 0) / stats.waktu_masuk.length
            : 480; // Default to 08:00 (480 minutes) if no arrival times
        const tardinessRate = stats.total_masuk > 0
            ? (stats.total_terlambat / stats.total_masuk) * 100
            : 0;
        const avgAccuracy = stats.akurasi_lokasi.length > 0
            ? stats.akurasi_lokasi.reduce((a, b) => a + b, 0) / stats.akurasi_lokasi.length
            : 10; // Default to 10m accuracy if no data

        const featureSet: ProcessedFeatureSet = {
            record: representativeRecord,
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
