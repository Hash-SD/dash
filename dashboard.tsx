"use client"

import type React from "react"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"
import {
  Upload,
  Search,
  Trash2,
  BarChart3,
  Table,
  ScatterChartIcon as Scatter3D,
  Clock,
  Users,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react"
import { DataStats } from "./components/data-stats"
import { DataInput } from "./components/data-input"
import InteractiveMap from "@/components/ui/InteractiveMap"; // Import InteractiveMap
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

interface AttendanceRecord {
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

interface ClusterPoint {
  x: number
  y: number
  cluster: number
  record: AttendanceRecord
  features: number[]
}

interface ClusterCenter {
  x: number
  y: number
}

export default function DashboardTIKPolda() {
  const [currentPage, setCurrentPage] = useState("beranda")
  const [data, setData] = useState<AttendanceRecord[]>([])
  const [fileName, setFileName] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [kValue, setKValue] = useState(3)
  // State for K-Means results from backend
  const [personnelFeatures, setPersonnelFeatures] = useState<any[]>([])
  const [clusterLabels, setClusterLabels] = useState<number[]>([])
  const [backendClusterCenters, setBackendClusterCenters] = useState<number[][]>([])
  const [isKmeansLoading, setIsKmeansLoading] = useState(false)
  const [kmeansError, setKmeansError] = useState<string | null>(null)

  // State for frontend visualization of clusters
  const [clusters, setClusters] = useState<ClusterPoint[]>([])
  const [clusterCenters, setClusterCenters] = useState<ClusterCenter[]>([]) 
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null)

  // State for table filters in Cluster Analysis page
  const [tableClusterFilter, setTableClusterFilter] = useState<string>("all");
  const [tableUnitFilter, setTableUnitFilter] = useState<string>("all");
  const [tableNameSearchTerm, setTableNameSearchTerm] = useState<string>("");

  const [aiAnalysis, setAiAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [fadeClass, setFadeClass] = useState("opacity-100")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileReplaceInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingToSheets, setIsUploadingToSheets] = useState(false)
  const [sheetsStatus, setSheetsStatus] = useState("")
  const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false)

  // Load data from Google Sheets on mount and refresh data
  const loadDataFromSheets = useCallback(async (showStatus = true) => {
    if (showStatus) {
      setIsLoadingFromSheets(true)
      setSheetsStatus("📊 Memuat data dari Google Sheets...")
    }

    try {
      const response = await fetch("/api/sheets")
      if (response.ok) {
        const result = await response.json()
        if (result.data && result.data.length > 0) {
          setData(result.data)
          setFileName("Google Sheets Data")

          // Save to localStorage as backup
          localStorage.setItem("tikPolda_data", JSON.stringify(result.data))
          localStorage.setItem("tikPolda_fileName", "Google Sheets Data")

          if (showStatus) {
            setSheetsStatus(`✅ Berhasil memuat ${result.data.length} record dari Google Sheets`)
          }
        } else {
          if (showStatus) {
            setSheetsStatus("📝 Tidak ada data di Google Sheets")
          }
          // Try localStorage as fallback
          const savedData = localStorage.getItem("tikPolda_data")
          const savedFileName = localStorage.getItem("tikPolda_fileName")

          if (savedData && savedFileName) {
            setData(JSON.parse(savedData))
            setFileName(savedFileName)
            if (showStatus) {
              setSheetsStatus("💾 Memuat data dari penyimpanan lokal")
            }
          }
        }
      } else {
        throw new Error("Failed to load from Google Sheets")
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
      if (showStatus) {
        setSheetsStatus("❌ Gagal memuat data dari Google Sheets")
      }

      // Try localStorage as fallback
      const savedData = localStorage.getItem("tikPolda_data")
      const savedFileName = localStorage.getItem("tikPolda_fileName")

      if (savedData && savedFileName) {
        setData(JSON.parse(savedData))
        setFileName(savedFileName)
        if (showStatus) {
          setSheetsStatus("💾 Memuat data dari penyimpanan lokal")
        }
      }
    } finally {
      if (showStatus) {
        setIsLoadingFromSheets(false)
        setTimeout(() => setSheetsStatus(""), 3000)
      }
    }
  }, [])

  // Load data on component mount
  useEffect(() => {
    loadDataFromSheets(true)
  }, [loadDataFromSheets])

  // Set initial selected date when data changes
  useEffect(() => {
    if (data.length > 0 && !selectedDate) {
      const dates = [...new Set(data.map((record) => record["Tanggal Absensi"] || "").filter(Boolean))]
      if (dates.length > 0) {
        setSelectedDate(dates[0])
      }
    }
  }, [data, selectedDate])

  const parseFileData = useCallback(async (file: File): Promise<AttendanceRecord[]> => {
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
  }, []);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setSheetsStatus(`🔄 Memproses file ${file.name}...`);
      try {
        const newParsedData = await parseFileData(file);

        if (newParsedData.length === 0) {
          setSheetsStatus("❌ File kosong atau format tidak valid setelah parsing.");
          setTimeout(() => setSheetsStatus(""), 3000);
          if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
          return;
        }
        
        setSheetsStatus("✅ File berhasil diproses. Memeriksa data di Google Sheets...");
        setIsUploadingToSheets(true);
        setSheetsStatus("🔄 Memuat data terbaru dari Google Sheets...")

        try {
          // First, get the latest data from Google Sheets
          await loadDataFromSheets(false)

          // Get the current data (either from sheets or local)
          const currentData = data

          // Check for duplicates based on NRP and Tanggal Absensi
          const existingKeys = new Set(
            currentData.map((record) => `${record.NRP || ""}_${record["Tanggal Absensi"] || ""}`),
          )

          const uniqueNewData = newParsedData.filter((record) => {
            const key = `${record.NRP || ""}_${record["Tanggal Absensi"] || ""}`
            return !existingKeys.has(key)
          })

          if (uniqueNewData.length === 0) {
            setSheetsStatus("⚠️ Semua data sudah ada di spreadsheet (tidak ada data baru)")
            setTimeout(() => setSheetsStatus(""), 3000)
            return
          }

          setSheetsStatus(`📤 Menambahkan ${uniqueNewData.length} record baru ke Google Sheets...`)

          // Upload only unique new data to Google Sheets in append mode
          const response = await fetch("/api/sheets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: uniqueNewData,
              fileName: file.name,
              appendMode: true,
            }),
          })

          if (response.ok) {
            const result = await response.json()

            // Reload data from sheets to get the latest state
            await loadDataFromSheets(false)

            setSheetsStatus(`✅ ${result.message} (${uniqueNewData.length} record baru ditambahkan)`)

            // Update filename to show the upload
            setFileName(`Google Sheets Data + ${file.name}`)
          } else {
            setSheetsStatus("❌ Gagal menambahkan data ke Google Sheets")
          }
        } catch (error) {
          console.error("Error uploading to Google Sheets:", error)
          setSheetsStatus("❌ Terjadi kesalahan saat mengunggah data")
        } finally {
          setIsUploadingToSheets(false);
          setTimeout(() => setSheetsStatus(""), 5000);
          if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        }
      } catch (uploadError) {
        console.error("Error during file upload process:", uploadError);
        setSheetsStatus(`❌ Terjadi kesalahan: ${uploadError instanceof Error ? uploadError.message : 'Error tidak diketahui'}`);
        setIsUploadingToSheets(false);
        setTimeout(() => setSheetsStatus(""), 5000);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      }
    },
    [parseFileData, data, loadDataFromSheets],
  )

  // Replace mode - completely replace data in sheets
  const handleFileReplace = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setSheetsStatus(`🔄 Memproses file ${file.name} untuk mengganti data...`);
      try {
        const parsedData = await parseFileData(file);

        if (parsedData.length === 0) {
          setSheetsStatus("❌ File kosong atau format tidak valid setelah parsing.");
          setTimeout(() => setSheetsStatus(""), 3000);
          if (fileReplaceInputRef.current) fileReplaceInputRef.current.value = ""; // Reset file input
          return;
        }
        
        setSheetsStatus("✅ File berhasil diproses. Mengganti data di Google Sheets...");
        setIsUploadingToSheets(true);
        setSheetsStatus("🔄 Mengganti semua data di Google Sheets...")

        try {
          const response = await fetch("/api/sheets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: parsedData,
              fileName: file.name,
              appendMode: false,
            }),
          })

          if (response.ok) {
            const result = await response.json()

            // Reload data from sheets to get the latest state
            await loadDataFromSheets(false)

            setSheetsStatus(`✅ ${result.message}`)
            setFileName(file.name)
          } else {
            setSheetsStatus("❌ Gagal mengganti data di Google Sheets")
          }
        } catch (error) {
          console.error("Error uploading to Google Sheets:", error)
          setSheetsStatus("❌ Terjadi kesalahan saat mengganti data")
        } finally {
          setIsUploadingToSheets(false);
          setTimeout(() => setSheetsStatus(""), 3000);
          if (fileReplaceInputRef.current) fileReplaceInputRef.current.value = ""; // Reset file input
        }
      } catch (uploadError) {
        console.error("Error during file replace process:", uploadError);
        setSheetsStatus(`❌ Terjadi kesalahan: ${uploadError instanceof Error ? uploadError.message : 'Error tidak diketahui'}`);
        setIsUploadingToSheets(false);
        setTimeout(() => setSheetsStatus(""), 5000);
        if (fileReplaceInputRef.current) fileReplaceInputRef.current.value = ""; // Reset file input
      }
    },
    [parseFileData, loadDataFromSheets],
  )

  const handleClearData = useCallback(() => {
    if (confirm("Apakah Anda yakin ingin menghapus semua data lokal? Data di Google Sheets tidak akan terpengaruh.")) {
      localStorage.removeItem("tikPolda_data")
      localStorage.removeItem("tikPolda_fileName")
      setData([])
      setFileName("")
      setSelectedDate("")
      setSheetsStatus("🗑️ Data lokal berhasil dihapus")
      setTimeout(() => setSheetsStatus(""), 3000)
    }
  }, [])

  const uploadToSheets = useCallback(async () => {
    if (data.length === 0) return

    setIsUploadingToSheets(true)
    setSheetsStatus("📤 Mengunggah data ke Google Sheets...")

    try {
      const response = await fetch("/api/sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data, fileName }),
      })

      if (!response.ok) {
        throw new Error("Failed to upload to Google Sheets")
      }

      const result = await response.json()
      setSheetsStatus(`✅ ${result.message}`)
      setTimeout(() => setSheetsStatus(""), 3000)
    } catch (error) {
      console.error("Error uploading to Google Sheets:", error)
      setSheetsStatus("❌ Gagal mengunggah ke Google Sheets")
      setTimeout(() => setSheetsStatus(""), 3000)
    } finally {
      setIsUploadingToSheets(false)
    }
  }, [data, fileName])

  const handlePageChange = useCallback((page: string) => {
    setFadeClass("opacity-0")
    setTimeout(() => {
      setCurrentPage(page)
      setFadeClass("opacity-100")
    }, 250)
  }, [])

const calculateFeatures = useCallback((records: AttendanceRecord[]) => {
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
        const record = masukRecords.find(r => r.NRP === nrp)!;
        const avgArrivalTime = stats.waktu_masuk.length > 0 ? stats.waktu_masuk.reduce((a, b) => a + b, 0) / stats.waktu_masuk.length : 480; // Default 08:00
        const tardinessRate = stats.total_masuk > 0 ? (stats.total_terlambat / stats.total_masuk) * 100 : 0;

        // Hitung rata-rata akurasi lokasi dari array akurasi_lokasi
        const avgAccuracy = stats.akurasi_lokasi.length > 0 ? stats.akurasi_lokasi.reduce((a, b) => a + b, 0) / stats.akurasi_lokasi.length : 10; // Default 10 jika tidak ada data

        // Fitur yang akan dikembalikan, termasuk yang untuk visualisasi dan yang untuk clustering
        const featureSet = {
            record,
            nrp,
            total_hadir: stats.total_hadir,
            total_terlambat: stats.total_terlambat,
            total_izin: stats.total_izin,
            total_masuk: stats.total_masuk,
            avgArrivalTime: !isNaN(avgArrivalTime) ? avgArrivalTime : 480,
            tardinessRate: !isNaN(tardinessRate) ? tardinessRate : 0,
            // Menyimpan juga rata2_akurasi_lokasi, jumlah_ip_berbeda, dan jumlah_perangkat_berbeda
            // untuk kemungkinan penggunaan di AI analysis atau tempat lain, meski tidak dinormalisasi di sini.
            rata2_akurasi_lokasi: !isNaN(avgAccuracy) ? avgAccuracy : 10,
            jumlah_ip_berbeda: stats.ip_addresses.size,
            jumlah_perangkat_berbeda: stats.perangkat_ids.size,
            // Fitur mentah untuk clustering (tidak dinormalisasi di sini, normalisasi terjadi di backend atau sebelum dikirim)
            features: [
                stats.total_hadir,
                stats.total_terlambat,
                !isNaN(avgAccuracy) ? avgAccuracy : 10, // avgAccuracy untuk clustering
                stats.ip_addresses.size,                // jumlah IP unik
                stats.perangkat_ids.size                // jumlah perangkat unik
            ].map(val => !isNaN(val) ? val : 0) // Pastikan semua fitur adalah angka, fallback ke 0 jika NaN
        };
        return featureSet;
    });

    // Jika Anda memutuskan untuk melakukan normalisasi di frontend sebelum mengirim ke backend:
    // const normalizeFeature = (values: number[]) => {
    //   if (values.length === 0) return [];
    //   const mean = values.reduce((a, b) => a + b, 0) / values.length;
    //   const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    //   return values.map((v) => (std > 0 ? (v - mean) / std : 0));
    // };

    // features.forEach(f => {
    //     // Example: if you want to normalize the 'features' array for backend
    //     // This assumes your backend expects normalized features. If not, send raw as above.
    //     // const rawClusteringFeatures = [f.total_hadir, f.total_terlambat, f.rata2_akurasi_lokasi, f.jumlah_ip_berbeda, f.jumlah_perangkat_berbeda];
    //     // f.features = normalizeFeature(rawClusteringFeatures.map(v => !isNaN(v) ? v : 0));
    // });

    return features;
}, []);

  // K-Means implementation (REMOVED - will be replaced by backend call)

  // Function to call K-Means backend API
  const runKMeansBackend = useCallback(async (featuresToCluster: number[][], k: number) => {
    if (featuresToCluster.length < k) {
      setKmeansError("Jumlah data tidak cukup untuk jumlah klaster yang dipilih.");
      setClusterLabels([]);
      setBackendClusterCenters([]);
      // setPersonnelFeatures([]); // personnelFeatures is set before this call, no need to clear here based on this condition alone
      return;
    }
    setIsKmeansLoading(true);
    setKmeansError(null);
    try {
      const response = await fetch("/api/kmeans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: featuresToCluster, k }),
      });

      if (!response.ok) {
        let errorMessage = `K-Means API request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If we can't parse the error response, use the status message
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      // Validate response structure
      if (!result.cluster_labels || !Array.isArray(result.cluster_labels)) {
        throw new Error("Invalid response: missing or invalid cluster_labels");
      }
      
      if (!result.cluster_centers || !Array.isArray(result.cluster_centers)) {
        throw new Error("Invalid response: missing or invalid cluster_centers");
      }

      if (result.cluster_labels.length !== featuresToCluster.length) {
        throw new Error("Response validation failed: cluster labels count mismatch");
      }

      if (result.cluster_centers.length !== k) {
        throw new Error("Response validation failed: cluster centers count mismatch");
      }

      setClusterLabels(result.cluster_labels);
      setBackendClusterCenters(result.cluster_centers);
      // Store the features that were sent for clustering, to align with labels
      // This assumes calculateFeatures() returns an array of objects, and we extract 'features' array from each
      // For now, storing the raw numerical features sent.
      // setPersonnelFeatures(featuresToCluster); // Storing the raw numerical features.
                                             // Or store the full feature objects if needed for later mapping.
    } catch (error: any) {
      console.error("Error running K-Means backend:", error);
      const errorMessage = error instanceof Error ? error.message : "Gagal menjalankan K-Means di backend.";
      setKmeansError(errorMessage);
      setClusterLabels([]);
      setBackendClusterCenters([]);
    } finally {
      setIsKmeansLoading(false);
    }
  }, []);


  // This useEffect will be responsible for preparing data for visualization (the 'clusters' state)
  // once clusterLabels are available from the backend.
  useEffect(() => {
    try {
      if (data.length > 0 && personnelFeatures.length > 0 && clusterLabels.length === personnelFeatures.length) {
        // The `personnelFeatures` here should be the array of objects produced by `calculateFeatures`,
        // before extracting the numerical `features` array for the backend.
        // This mapping needs to be precise. Let's assume `calculateFeatures` produces an array of objects,
        // and we also store these original objects that correspond to `clusterLabels`.

        // For now, let's adjust `calculateFeatures` to return an object that also includes the original record
        // or enough info to map back. The `personnelFeatures` state should store these.

        const newClustersForVisualization: ClusterPoint[] = personnelFeatures
          .map((featureSet, index) => {
            // Validate featureSet structure
            if (!featureSet || typeof featureSet !== 'object') {
              console.warn(`Invalid featureSet at index ${index}:`, featureSet);
              return null;
            }

            // Ensure all required properties exist and are valid
            const x = typeof featureSet.avgArrivalTime === 'number' ? featureSet.avgArrivalTime : 480; // Default to 8:00 AM
            const y = typeof featureSet.tardinessRate === 'number' ? featureSet.tardinessRate : 0;
            const cluster = typeof clusterLabels[index] === 'number' ? clusterLabels[index] : 0;
            const record = featureSet.record || {};
            const features = Array.isArray(featureSet.features) ? featureSet.features : [];

            return {
              x,
              y,
              cluster,
              record,
              features,
            };
          })
          .filter((item): item is ClusterPoint => item !== null); // Filter out any null entries

        setClusters(newClustersForVisualization);

        // Update visualization cluster centers (optional, could also use backendClusterCenters if scaled appropriately)
        // This calculates centroids based on the visualization coordinates (avgArrivalTime, tardinessRate)
        const newVisCenters: ClusterCenter[] = [];
        for (let i = 0; i < kValue; i++) {
          const pointsInCluster = newClustersForVisualization.filter(p => p && typeof p.cluster === 'number' && p.cluster === i);
          if (pointsInCluster.length > 0) {
            const validPoints = pointsInCluster.filter(p => typeof p.x === 'number' && typeof p.y === 'number');
            if (validPoints.length > 0) {
              const avgX = validPoints.reduce((sum, p) => sum + p.x, 0) / validPoints.length;
              const avgY = validPoints.reduce((sum, p) => sum + p.y, 0) / validPoints.length;
              newVisCenters.push({ x: avgX, y: avgY });
            } else {
              newVisCenters.push({ x: 480, y: 0 }); // Default position
            }
          } else {
            // Handle empty cluster for visualization center (e.g., place it far off or use a default)
            // Or use a more sophisticated way if backendClusterCenters can be unscaled
            newVisCenters.push({ x: 480, y: 0});
          }
        }
        setClusterCenters(newVisCenters);

      } else if (clusterLabels.length === 0 && personnelFeatures.length > 0) {
        // If labels are cleared but features were there, clear visualization too
        setClusters([]);
        setClusterCenters([]);
      }
    } catch (error) {
      console.error("Error updating cluster visualization:", error);
      // Reset to safe state on error
      setClusters([]);
      setClusterCenters([]);
      if (!kmeansError) {
        setKmeansError("Terjadi kesalahan saat memproses data klaster untuk visualisasi.");
      }
    }
  }, [clusterLabels, personnelFeatures, data, kValue, kmeansError]);


  // Run K-Means clustering when data or kValue changes
  useEffect(() => {
    if (data.length > 0) {
      const extractedFeatureObjects = calculateFeatures(data); // Returns array of objects like { record, nrp, ..., features: [...] }
      
      // Store these objects that include original record and visualization coords
      setPersonnelFeatures(extractedFeatureObjects); 
      
      // Extract only the numerical features for the backend
      const numericalFeatures = extractedFeatureObjects.map(f => f.features);

      if (numericalFeatures.length > 0) {
        runKMeansBackend(numericalFeatures, kValue);
      } else {
        setClusterLabels([]);
        setBackendClusterCenters([]);
        setKmeansError(null);
      }
    } else {
      setPersonnelFeatures([]);
      setClusterLabels([]);
      setBackendClusterCenters([]);
      setKmeansError(null);
    }
  }, [data, kValue, calculateFeatures, runKMeansBackend]);


  // Generate AI analysis
  const generateAIAnalysis = useCallback(async () => {
    // Ensure we use the `clusters` state which is now populated based on backend K-Means results
    if (clusters.length === 0 || personnelFeatures.length === 0) {
        setAiAnalysis("<p>Data klaster tidak cukup untuk analisis AI. Jalankan K-Means terlebih dahulu.</p>");
        return;
    }
    setIsAnalyzing(true);
    setAiAnalysis(""); // Clear previous analysis

    try {
      const clusterSummary = Array.from({ length: kValue }, (_, i) => {
        // Filter points belonging to the current cluster from the `clusters` state (which has backend labels)
        const clusterPoints = clusters.filter((p) => p && typeof p.cluster === 'number' && p.cluster === i);
        if (clusterPoints.length === 0) return null;

        // The `clusterPoints` already contain the original record and calculated features for visualization (x, y)
        // We need to ensure the `personnelFeatures` (which `calculateFeatures` produced)
        // are correctly mapped to these `clusterPoints` if we need more detailed features
        // than just x and y for the summary.

        // Let's re-access the full feature objects for the summary
        // This assumes `personnelFeatures` state holds the array of objects { record, nrp, ..., features: [...] }
        // and `clusterLabels` correctly maps to this array.

        const membersInCluster = personnelFeatures.filter((pf, index) => 
          pf && typeof pf === 'object' && 
          clusterLabels[index] !== undefined && 
          clusterLabels[index] === i
        );

        if (membersInCluster.length === 0) return null;

        // Calculate averages with error handling
        const safeAverage = (values: number[]) => values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        
        const avgArrivalValues = membersInCluster.map(m => typeof m.avgArrivalTime === 'number' ? m.avgArrivalTime : 480).filter(v => !isNaN(v));
        const avgTardinessValues = membersInCluster.map(m => typeof m.tardinessRate === 'number' ? m.tardinessRate : 0).filter(v => !isNaN(v));
        const avgHadirValues = membersInCluster.map(m => typeof m.total_hadir === 'number' ? m.total_hadir : 0).filter(v => !isNaN(v));
        const avgTerlambatValues = membersInCluster.map(m => typeof m.total_terlambat === 'number' ? m.total_terlambat : 0).filter(v => !isNaN(v));
        const avgIzinValues = membersInCluster.map(m => typeof m.total_izin === 'number' ? m.total_izin : 0).filter(v => !isNaN(v));
        const avgAkurasiValues = membersInCluster.map(m => typeof m.rata2_akurasi_lokasi === 'number' ? m.rata2_akurasi_lokasi : 10).filter(v => !isNaN(v));
        const avgIpValues = membersInCluster.map(m => typeof m.jumlah_ip_berbeda === 'number' ? m.jumlah_ip_berbeda : 1).filter(v => !isNaN(v));
        const avgPerangkatValues = membersInCluster.map(m => typeof m.jumlah_perangkat_berbeda === 'number' ? m.jumlah_perangkat_berbeda : 1).filter(v => !isNaN(v));

        const avgArrival = safeAverage(avgArrivalValues);
        const avgTardiness = safeAverage(avgTardinessValues);
        const avgHadir = safeAverage(avgHadirValues);
        const avgTerlambat = safeAverage(avgTerlambatValues);
        const avgIzin = safeAverage(avgIzinValues);
        const avgAkurasi = safeAverage(avgAkurasiValues);
        const avgIpBerbeda = safeAverage(avgIpValues);
        const avgPerangkatBerbeda = safeAverage(avgPerangkatValues);

        let clusterName = ""; // You might want to derive this from backend_cluster_centers or other metrics
        // Example naming based on current frontend logic, adapt as needed
        if (avgTardiness < 5 && avgArrival < 480 && avgIpBerbeda <= 1.2) clusterName = "Disiplin Tinggi";
        else if (avgTardiness < 15 && avgIpBerbeda <= 2) clusterName = "Disiplin Sedang";
        else if (avgTardiness < 30) clusterName = "Perlu Pembinaan";
        else if (avgIpBerbeda > 3 || avgPerangkatBerbeda > 2) clusterName = "Inkonsisten";
        else clusterName = "Bermasalah";
        
        return {
          cluster: i,
          name: clusterName, // Consider if backend should suggest names or if frontend derives it
          memberCount: membersInCluster.length,
          avgArrivalTime: `${Math.floor(avgArrival / 60)}:${String(Math.floor(avgArrival % 60)).padStart(2, "0")}`,
          tardinessRate: `${avgTardiness.toFixed(1)}%`,
          avgHadir: avgHadir.toFixed(1),
          avgTerlambat: avgTerlambat.toFixed(1),
          avgIzin: avgIzin.toFixed(1),
          avgAkurasiLokasi: `${avgAkurasi.toFixed(1)}m`,
          avgIpBerbeda: avgIpBerbeda.toFixed(1),
          avgPerangkatBerbeda: avgPerangkatBerbeda.toFixed(1),
          members: membersInCluster.map((pf) => ({
            nama: (pf.record && pf.record.Nama) ? String(pf.record.Nama) : "",
            unit: (pf.record && pf.record.Unit) ? String(pf.record.Unit) : "",
            nrp: (pf.record && pf.record.NRP) ? String(pf.record.NRP) : "",
          })),
          unitDistribution: membersInCluster.reduce(
            (acc, pf) => {
              const unit = (pf.record && pf.record.Unit) ? String(pf.record.Unit) : "Unknown";
              acc[unit] = (acc[unit] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
        };
      }).filter(Boolean);

      if (!clusterSummary || clusterSummary.length === 0) {
          setAiAnalysis("<p>Tidak ada ringkasan klaster yang valid untuk dikirim ke AI.</p>");
          setIsAnalyzing(false);
          return;
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clusterSummary }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate analysis: HTTP ${response.status}`)
      }

      const result = await response.json()
      if (result.analysis) {
        setAiAnalysis(result.analysis)
      } else {
        throw new Error("Invalid response from analysis API")
      }
    } catch (error) {
      console.error("Error generating AI analysis:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setAiAnalysis(`<p>Error generating analysis: ${errorMessage}. Please check your API configuration and try again.</p>`)
    } finally {
      setIsAnalyzing(false)
    }
  }, [clusters, kValue, data, calculateFeatures, personnelFeatures, clusterLabels])

  // Filtered data based on selected date
  const filteredData = useMemo(() => {
    if (!selectedDate) return data
    return data.filter((record) => record["Tanggal Absensi"] === selectedDate)
  }, [data, selectedDate])

  // Search filtered data
  const searchFilteredData = useMemo(() => {
    if (!searchTerm) return data
    return data.filter((record) =>
      Object.values(record).some((value) => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }, [data, searchTerm])

  // KPI calculations
  const kpis = useMemo(() => {
    const total = filteredData.length
    const hadir = filteredData.filter((r) => r.Status === "Hadir").length
    const terlambat = filteredData.filter((r) => r.Status === "Terlambat").length
    const izin = filteredData.filter((r) => r.Status === "Izin").length
    const pulang = filteredData.filter((r) => r.Status === "Pulang").length
    const units = new Set(filteredData.map((r) => r.Unit).filter(Boolean)).size

    return {
      total,
      hadir,
      terlambat,
      izin,
      pulang,
      hadirRate: total > 0 ? ((hadir / total) * 100).toFixed(1) : "0",
      units,
    }
  }, [filteredData])

  // Chart data
  const statusChartData = useMemo(
    () =>
      [
        { name: "Hadir", value: kpis.hadir, color: "#00C49F" },
        { name: "Terlambat", value: kpis.terlambat, color: "#FF8042" },
        { name: "Izin", value: kpis.izin, color: "#FFBB28" },
        { name: "Pulang", value: kpis.pulang, color: "#0088FE" },
      ].filter((item) => item.value > 0),
    [kpis],
  )

  const unitChartData = useMemo(() => {
    const unitCounts = filteredData.reduce(
      (acc, record) => {
        const unit = record.Unit || "Unknown"
        acc[unit] = (acc[unit] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(unitCounts).map(([unit, count]) => ({
      unit,
      count,
    }))
  }, [filteredData])

  const hourlyChartData = useMemo(() => {
    const hourlyCounts = filteredData.reduce(
      (acc, record) => {
        const waktuAbsensi = record["Waktu Absensi"] || "08:00"
        const hour = Number.parseInt(waktuAbsensi.split(":")[0] || "8")
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      },
      {} as Record<number, number>,
    )

    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      count: hourlyCounts[hour] || 0,
    })).filter((item) => item.count > 0)
  }, [filteredData])

  const uniqueDates = useMemo(
    () => [...new Set(data.map((record) => record["Tanggal Absensi"]).filter(Boolean))],
    [data],
  )

  const clusterNames = ["Disiplin Tinggi", "Disiplin Sedang", "Perlu Pembinaan", "Inkonsisten", "Bermasalah"]

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <Sidebar className="w-64 bg-[#003366] text-white">
          <SidebarHeader>
            <div className="flex items-center space-x-3 p-4">
              <img
                src="https://cdn-1.timesmedia.co.id/images/2022/03/24/tik-polri.jpg"
                alt="TIK Polda Logo"
                className="h-[50px] w-[50px] object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-white">Dashboard TIK</h1>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-white/80 font-medium px-2 py-2">
                Navigasi
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { id: "beranda", label: "Beranda", icon: BarChart3 },
                    { id: "klaster", label: "Analisis Klaster", icon: Scatter3D },
                    { id: "lokasi", label: "Analisis Lokasi", icon: BarChart3 },
                    { id: "individu", label: "Analisis Individu", icon: Users },
                  ].map(({ id, label, icon: Icon }) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton
                        onClick={() => handlePageChange(id)}
                        isActive={currentPage === id}
                        className={`w-full justify-start text-white/90 hover:bg-white/10 hover:text-white rounded-lg mx-1 transition-all duration-200 ${
                          currentPage === id ? "bg-white text-primary font-medium shadow-sm" : ""
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-white/80 font-medium px-2 py-2">
                Manajemen Data
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => loadDataFromSheets(true)}
                      disabled={isLoadingFromSheets}
                      className="w-full justify-start text-white/90 hover:bg-white/10 hover:text-white rounded-lg mx-1 transition-all duration-200 disabled:opacity-50"
                    >
                      {isLoadingFromSheets ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>Refresh Data</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingToSheets}
                      className="w-full justify-start text-white/90 hover:bg-white/10 hover:text-white rounded-lg mx-1 transition-all duration-200 disabled:opacity-50"
                    >
                      {isUploadingToSheets ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>Tambah Data</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => fileReplaceInputRef.current?.click()}
                      disabled={isUploadingToSheets}
                      className="w-full justify-start text-white/90 hover:bg-white/10 hover:text-white rounded-lg mx-1 transition-all duration-200 disabled:opacity-50"
                    >
                      {isUploadingToSheets ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>Ganti Data</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={uploadToSheets}
                      disabled={isUploadingToSheets || data.length === 0}
                      className="w-full justify-start text-white/90 hover:bg-white/10 hover:text-white rounded-lg mx-1 transition-all duration-200 disabled:opacity-50"
                    >
                      {isUploadingToSheets ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>Sync Sheets</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={handleClearData}
                      className="w-full justify-start text-red-200 hover:bg-red-600/20 hover:text-red-100 rounded-lg mx-1 transition-all duration-200 border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Data</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="bg-[#003366] text-white border-t border-white/20">
            <div className="p-4 text-xs text-white/80">
              <p>Data: {fileName || "Belum ada data"}</p>
              <p>Records: {data.length}</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-white shadow-md border-b h-[60px]">
            <div className="flex items-center justify-between h-full px-4">
              <div className="flex items-center space-x-4">
                <SidebarTrigger />
                <h2 className="text-xl font-bold text-gray-900">
                  {currentPage === "beranda" && "Ringkasan Absensi"}
                  {currentPage === "klaster" && "Analisis Klaster"}
                  {currentPage === "lokasi" && "Analisis Lokasi"}
                  {currentPage === "individu" && "Analisis Individu"}
                </h2>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100" title="Toggle Theme">
                <div className="w-5 h-5 bg-yellow-400 rounded-full" />
              </button>
            </div>
          </header>

              {/* Status Messages */}
          {sheetsStatus && (
            <div className="px-4 py-2">
                  <div className="p-3 bg-blue-100 border border-blue-300 text-blue-800 rounded-lg shadow-sm">
                    <p className="text-sm">{sheetsStatus}</p>
              </div>
            </div>
          )}
              {kmeansError && (
                 <div className="px-4 py-2">
                    <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg shadow-sm">
                        <p className="text-sm font-semibold">K-Means Error:</p>
                        <p className="text-sm">{kmeansError}</p>
                    </div>
                </div>
              )}
              {isKmeansLoading && (
                <div className="px-4 py-2">
                    <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg shadow-sm flex items-center">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <p className="text-sm">Menjalankan K-Means di backend...</p>
                    </div>
                </div>
              )}


          {/* Page Content */}
          <main className={`transition-opacity duration-500 ${fadeClass} p-8 flex-1 bg-gray-50/50`}>
            {currentPage === "beranda" && (
              <div>
                {/* File Info */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Sumber Data:</strong> {fileName || "Belum ada data"} | <strong>Total Records:</strong>{" "}
                    {data.length}
                  </p>
                </div>

                    {/* Interactive Map */}
                    <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Peta Sebaran Absensi</h3>
                      { data.length > 0 ? (
                        <InteractiveMap records={filteredData} selectedDate={selectedDate} />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <BarChart3 className="w-8 h-8 text-gray-400" />
                          </div>
                          <h4 className="text-lg font-semibold text-foreground mb-2">Peta Tidak Tersedia</h4>
                          <p className="text-muted-foreground max-w-sm">
                            Data lokasi absensi belum tersedia. Unggah data yang berisi informasi koordinat untuk melihat peta sebaran.
                          </p>
                        </div>
                      )}
                    </div>

                {/* Data Statistics */}
                <DataStats data={data} fileName={fileName} />

                {/* Date Filter */}
                {uniqueDates.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Filter Tanggal:</label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {uniqueDates.map((date) => (
                        <option key={date} value={date}>
                          {date}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* KPI Cards - Enhanced Design */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                  <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Personel</p>
                        <p className="text-3xl font-black text-foreground">{kpis.total}</p>
                        <p className="text-xs text-muted-foreground mt-1">Karyawan terdaftar</p>
                      </div>
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-100 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Tingkat Kehadiran</p>
                        <p className="text-3xl font-black text-foreground">{kpis.hadirRate}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Dari total hari kerja</p>
                      </div>
                      <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                        <Clock className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-100 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Keterlambatan</p>
                        <p className="text-3xl font-black text-foreground">{((kpis.terlambat / (kpis.total || 1)) * 100).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{kpis.terlambat} dari {kpis.total} personel</p>
                      </div>
                      <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-amber-100 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Izin & Sakit</p>
                        <p className="text-3xl font-black text-foreground">{kpis.izin}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total perizinan</p>
                      </div>
                      <div className="flex items-center justify-center w-12 h-12 bg-amber-50 rounded-full group-hover:bg-amber-100 transition-colors">
                        <TrendingUp className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                {isLoadingFromSheets ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Status Chart Skeleton */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <Skeleton className="h-6 w-48 mb-4" />
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="space-y-3 text-center">
                          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                          <Skeleton className="h-4 w-24 mx-auto" />
                        </div>
                      </div>
                    </div>

                    {/* Unit Chart Skeleton */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <Skeleton className="h-6 w-40 mb-4" />
                      <div className="h-[300px] space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center space-x-3">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 flex-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : data.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Status Pie Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Status Kehadiran</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Unit Bar Chart */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Kehadiran per Unit</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={unitChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="unit" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0088FE" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Hourly Trend */}
                {hourlyChartData.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Kehadiran per Jam</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={hourlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* No Data Message */}
                {data.length === 0 && (
                  <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <div className="text-gray-400 mb-4">
                      <BarChart3 className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Data</h3>
                    <p className="text-gray-600 mb-4">
                      Silakan unggah file CSV atau tambah data melalui menu Input Data untuk mulai menganalisis.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah Data CSV</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentPage === "klaster" && (
              <div>
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Cari data..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Data Table */}
                {data.length > 0 ? (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(data[0] || {}).filter(header => header !== "ID Perangkat").map((header) => (
                              <th
                                key={header}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {searchFilteredData.map((record, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {Object.entries(record).filter(([key]) => key !== "ID Perangkat").map(([key, value]) => (
                                <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {key === "URL Foto" ? (
                                    <a
                                      href={value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      Lihat Foto
                                    </a>
                                  ) : (
                                    value
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="max-w-sm mx-auto">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Table className="w-10 h-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">Belum Ada Data Absensi</h3>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        Untuk memulai analisis, silakan unggah file data absensi dalam format CSV atau Excel.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Unggah Data Baru
                        </button>
                        <button
                          onClick={() => loadDataFromSheets(true)}
                          disabled={isLoadingFromSheets}
                          className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        >
                          {isLoadingFromSheets ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Muat dari Sheets
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentPage === "klaster" && (
              <div>
                {isKmeansLoading ? (
                  <div className="space-y-6">
                    {/* K-Means Processing Banner */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-6 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-purple-900">Memproses Analisis K-Means</h3>
                          <p className="text-purple-700 mt-1">
                            Sistem sedang mengelompokkan personel berdasarkan pola absensi. Proses ini membutuhkan beberapa saat...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Skeleton for Controls */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-10 w-20" />
                        </div>
                        <Skeleton className="h-10 w-40" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="p-4 rounded-lg border border-gray-200">
                            <Skeleton className="h-5 w-24 mb-2" />
                            <Skeleton className="h-8 w-16 mb-1" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Skeleton for Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <Skeleton className="h-6 w-48 mb-4" />
                        <div className="flex items-center justify-center h-[300px]">
                          <Skeleton className="h-48 w-48 rounded-full" />
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <Skeleton className="h-6 w-56 mb-4" />
                        <div className="flex items-center justify-center h-[300px]">
                          <Skeleton className="h-48 w-48 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : data.length > 0 && clusterLabels.length > 0 && personnelFeatures.length > 0 ? (
                  <>
                    {/* K-Means Controls & Summary Cards */}
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center space-x-4">
                          <label htmlFor="kValueSelect" className="text-sm font-medium text-gray-700">Jumlah Klaster (K):</label>
                          <select
                            id="kValueSelect"
                            value={kValue}
                            onChange={(e) => setKValue(Number.parseInt(e.target.value))}
                            disabled={isKmeansLoading}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70"
                          >
                            {[2, 3, 4, 5].map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={generateAIAnalysis}
                          disabled={isAnalyzing || isKmeansLoading || clusterLabels.length === 0}
                          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Scatter3D className="w-4 h-4" /> /* Consider a more AI-specific icon */
                          )}
                          <span>{isAnalyzing ? "Menganalisis..." : "Buat Analisis AI"}</span>
                        </button>
                      </div>

                      {/* Cluster Summary Cards */}
                      {/* Adjusted lg:grid-cols-kValue to a fixed number or a dynamic class based on kValue */}
                      <div className={`grid grid-cols-1 md:grid-cols-2 ${kValue <= 4 ? `lg:grid-cols-${kValue}` : 'lg:grid-cols-4'} gap-4 mb-6`}>
                        {Array.from({ length: kValue }, (_, i) => {
                          const membersInThisCluster = personnelFeatures.filter((pf, index) => clusterLabels[index] === i);
                          const clusterName = clusterNames[i] || `Klaster ${i + 1}`;
                          return (
                            <div 
                              key={`summary-card-${i}`}
                              className="p-4 rounded-lg shadow-sm border"
                              style={{ borderColor: COLORS[i % COLORS.length], backgroundColor: `${COLORS[i % COLORS.length]}1A` }} // Light background based on cluster color
                            >
                              <h4 className="text-md font-semibold mb-1" style={{ color: COLORS[i % COLORS.length] }}>{clusterName}</h4>
                              <p className="text-2xl font-bold text-gray-800">{membersInThisCluster.length}</p>
                              <p className="text-xs text-gray-600">Personel</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Charts Side-by-Side: Pie Chart and Radar Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Pie Chart Distribusi Klaster */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                             <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Personel per Klaster</h3>
                             <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={Array.from({ length: kValue }, (_, i) => ({
                                            name: clusterNames[i] || `Klaster ${i + 1}`,
                                            value: clusterLabels.filter(label => label === i).length,
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent, value }) => value > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {Array.from({ length: kValue }, (_, i) => (
                                            <Cell key={`cell-pie-${i}`} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Radar Chart Karakteristik Klaster */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Karakteristik Rata-rata Klaster</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                    {(() => {
                                        const metrics = [
                                            { key: 'avgTotalHadir', name: 'Avg Hadir', max: 0},
                                            { key: 'avgTotalTerlambat', name: 'Avg Terlambat', max: 0 },
                                            { key: 'avgTotalIzin', name: 'Avg Izin', max: 0 },
                                            { key: 'avgJamMasuk', name: 'Avg Jam Masuk (min)', max: 0 }, // Max e.g., 18*60 = 1080
                                            { key: 'avgAkurasiLokasi', name: 'Avg Akurasi (m)', max: 0 }, // Max e.g., 100
                                            { key: 'avgIpBerbeda', name: 'Avg IP Unik', max: 0 },
                                            { key: 'avgPerangkatBerbeda', name: 'Avg Perangkat Unik', max: 0 }
                                        ];

                                        const radarChartData = metrics.map(metric => {
                                            const entry: any = { metric: metric.name };
                                            let currentMax = 0;
                                            Array.from({ length: kValue }, (_, i) => {
                                                const clusterKey = clusterNames[i] || `Klaster ${i + 1}`;
                                                const members = personnelFeatures.filter((pf, index) => clusterLabels[index] === i);
                                                if (members.length > 0) {
                                                    let value = 0;
                                                    switch (metric.key) {
                                                        case 'avgTotalHadir': value = members.reduce((sum, m) => sum + m.total_hadir, 0) / members.length; break;
                                                        case 'avgTotalTerlambat': value = members.reduce((sum, m) => sum + m.total_terlambat, 0) / members.length; break;
                                                        case 'avgTotalIzin': value = members.reduce((sum, m) => sum + m.total_izin, 0) / members.length; break;
                                                        case 'avgJamMasuk': value = members.reduce((sum, m) => sum + m.rata2_jam_masuk, 0) / members.length; break;
                                                        case 'avgAkurasiLokasi': value = members.reduce((sum, m) => sum + m.rata2_akurasi_lokasi, 0) / members.length; break;
                                                        case 'avgIpBerbeda': value = members.reduce((sum, m) => sum + m.jumlah_ip_berbeda, 0) / members.length; break;
                                                        case 'avgPerangkatBerbeda': value = members.reduce((sum, m) => sum + m.jumlah_perangkat_berbeda, 0) / members.length; break;
                                                    }
                                                    entry[clusterKey] = parseFloat(value.toFixed(2));
                                                    if (entry[clusterKey] > currentMax) currentMax = entry[clusterKey];
                                                } else {
                                                    entry[clusterKey] = 0;
                                                }
                                            });
                                            // A simple way to set fullMark, might need per-metric thought
                                            entry.fullMark = currentMax > 0 ? Math.ceil(currentMax * 1.2) : 1; // Add 20% buffer or default to 1
                                            if (metric.key === 'avgJamMasuk') entry.fullMark = Math.max(currentMax, 600); // e.g. max 10:00
                                            if (metric.key === 'avgAkurasiLokasi') entry.fullMark = Math.max(currentMax, 50); // e.g. max 50m
                                            return entry;
                                        });
                                        
                                        if (radarChartData.every(d => metrics.every(m => d[(clusterNames[0] || `Klaster 1`)] === undefined))) {
                                            return <p className="text-gray-500 text-center py-10">Data tidak cukup untuk Radar Chart.</p>;
                                        }

                                        return (
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 'auto']} tickFormatter={(value) => typeof value === 'number' ? value.toFixed(0) : value} />
                                                {Array.from({ length: kValue }, (_, i) => {
                                                    const clusterNameKey = clusterNames[i] || `Klaster ${i + 1}`;
                                                     // Check if this cluster has any data in the radarChartData
                                                    if (radarChartData.some(d => d[clusterNameKey] !== undefined && d[clusterNameKey] > 0)) {
                                                        return (
                                                            <Radar
                                                                key={`radar-series-${i}`}
                                                                name={clusterNameKey}
                                                                dataKey={clusterNameKey}
                                                                stroke={COLORS[i % COLORS.length]}
                                                                fill={COLORS[i % COLORS.length]}
                                                                fillOpacity={0.5}
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                })}
                                                <Legend />
                                                <Tooltip />
                                            </RadarChart>
                                        );
                                    })()}
                                </ResponsiveContainer>
                        </div>
                    </div>

<div className="bg-white p-6 rounded-lg shadow-md mb-8">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualisasi Pola Klaster (K-Means)</h3>

  {/* ---- AWAL DARI BLOK PELINDUNG ---- */}
  {(isKmeansLoading || clusters.length === 0) ? (
    <div className="flex items-center justify-center h-[500px] text-gray-500">
      {isKmeansLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <p>Data tidak cukup untuk visualisasi.</p>}
    </div>
  ) : (
    <ResponsiveContainer width="100%" height={500}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Rata-rata Waktu Kedatangan (menit)"
          domain={['dataMin - 15', 'dataMax + 15']}
          tickFormatter={(time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Tingkat Keterlambatan (%)"
          unit="%"
          domain={[0, 'dataMax + 10']}
        />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload as ClusterPoint;
              if (!data || !data.record) return null;

              const clusterName = clusterNames[data.cluster] || `Klaster ${data.cluster + 1}`;
              const arrivalTime = typeof data.x === 'number' ? `${Math.floor(data.x / 60)}:${String(Math.floor(data.x % 60)).padStart(2, '0')}` : 'N/A';
              const tardiness = typeof data.y === 'number' ? `${data.y.toFixed(1)}%` : 'N/A';

              return (
                <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                  <p className="font-semibold">{data.record.Nama || 'N/A'}</p>
                  <p>Unit: {data.record.Unit || 'N/A'}</p>
                  <p>Klaster: {clusterName}</p>
                  <p>Avg Kedatangan: {arrivalTime}</p>
                  <p>Tingkat Terlambat: {tardiness}</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        {Array.from({ length: kValue }).map((_, i) => (
          <Scatter
            key={`cluster-${i}`}
            name={clusterNames[i] || `Klaster ${i + 1}`}
            data={clusters.filter(p => p.cluster === i)}
            fill={COLORS[i % COLORS.length]}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  )}
  {/* ---- AKHIR DARI BLOK PELINDUNG ---- */}
</div>

                    {/* Interactive Personnel Table */}
                    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Personel per Klaster</h3>
                        {/* Filters: Cluster, Unit, Name Search */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* Cluster Filter */}
                            <div>
                                <label htmlFor="tableClusterFilter" className="block text-sm font-medium text-gray-700">Filter Klaster:</label>
                                <select 
                                    id="tableClusterFilter"
                                    value={tableClusterFilter} 
                                    onChange={(e) => setTableClusterFilter(e.target.value)}
                                    disabled={isKmeansLoading || personnelFeatures.length === 0}
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70"
                                >
                                    <option value="all">Semua Klaster</option>
                                    {Array.from({ length: kValue }, (_, i) => (
                                        <option key={`filter-opt-${i}`} value={i}>
                                            {clusterNames[i] || `Klaster ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* Unit Filter (Dropdown of unique units) */}
                            <div>
                                <label htmlFor="tableUnitFilter" className="block text-sm font-medium text-gray-700">Filter Unit Kerja:</label>
                                <select 
                                    id="tableUnitFilter"
                                    value={tableUnitFilter}
                                    onChange={(e) => setTableUnitFilter(e.target.value)}
                                    disabled={isKmeansLoading || personnelFeatures.length === 0}
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70"
                                >
                                    <option value="all">Semua Unit</option>
                                    {[...new Set(personnelFeatures.map(pf => pf.record.Unit || "Tidak Diketahui"))].sort().map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Name Search */}
                            <div>
                                <label htmlFor="tableNameSearch" className="block text-sm font-medium text-gray-700">Cari Nama Personel:</label>
                                <input 
                                    type="text" 
                                    id="tableNameSearch"
                                    value={tableNameSearchTerm}
                                    onChange={(e) => setTableNameSearchTerm(e.target.value)}
                                    disabled={isKmeansLoading || personnelFeatures.length === 0}
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70"
                                    placeholder="Ketik nama..."
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NRP</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klaster</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Jam Masuk</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Terlambat</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Izin</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Unik</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Unik</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(() => {
                                        const filteredPersonnel = personnelFeatures
                                            .map((pf, index) => ({ ...pf, clusterLabel: clusterLabels[index] })) // Add clusterLabel to each personnel feature object
                                            .filter(pf => 
                                                (tableClusterFilter === "all" || (pf.clusterLabel !== undefined && pf.clusterLabel.toString() === tableClusterFilter)) &&
                                                (tableUnitFilter === "all" || (pf.record.Unit || "Tidak Diketahui") === tableUnitFilter) &&
                                                (tableNameSearchTerm === "" || (pf.record.Nama || "").toLowerCase().includes(tableNameSearchTerm.toLowerCase()))
                                            );

                                        if (filteredPersonnel.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={9} className="text-center py-4 text-gray-500">
                                                        Tidak ada data personel yang cocok dengan filter.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return filteredPersonnel.map((pf, index) => (
                                            <tr key={pf.nrp || `person-${index}-${pf.clusterLabel}`}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.record.NRP}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">{pf.record.Nama}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.record.Unit || "Tidak Diketahui"}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                    <span 
                                                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                                        style={{
                                                            backgroundColor: `${COLORS[pf.clusterLabel % COLORS.length]}33`, 
                                                            color: COLORS[pf.clusterLabel % COLORS.length]
                                                        }}
                                                    >
                                                        {clusterNames[pf.clusterLabel] || `Klaster ${pf.clusterLabel + 1}`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {`${Math.floor(pf.rata2_jam_masuk / 60)}:${String(Math.floor(pf.rata2_jam_masuk % 60)).padStart(2, "0")}`}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.total_terlambat}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.total_izin}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.jumlah_ip_berbeda}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.jumlah_perangkat_berbeda}</td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                         {(personnelFeatures.length === 0 && !isKmeansLoading) && <p className="text-center text-gray-500 py-4">Tidak ada data personel untuk ditampilkan.</p>}
                    </div>

                    {/* AI Analysis */}
                    {aiAnalysis && !isAnalyzing && (
                      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insight Analisis AI</h3>
                        <div 
                          className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none" 
                          dangerouslySetInnerHTML={{ __html: aiAnalysis || "<p>Belum ada analisis AI.</p>" }} 
                        />
                      </div>
                    )}
                     {isAnalyzing && (
                        <div className="mt-8 flex items-center justify-center p-6 bg-white rounded-lg shadow-md">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                            <p className="text-lg text-gray-700">Memproses analisis AI, mohon tunggu...</p>
                        </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Scatter3D className="w-10 h-10 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">Analisis Klaster Belum Tersedia</h3>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        {data.length === 0 
                          ? "Unggah data absensi terlebih dahulu untuk memulai analisis clustering personel."
                          : "Pastikan data telah diproses dengan benar. Sistem akan otomatis menjalankan algoritma K-Means."
                        }
                      </p>
                      {kmeansError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                          <p className="text-red-700 text-sm font-medium">Error K-Means:</p>
                          <p className="text-red-600 text-sm">{kmeansError}</p>
                        </div>
                      )}
                      {data.length === 0 ? (
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Unggah Data
                          </button>
                          <button
                            onClick={() => loadDataFromSheets(true)}
                            disabled={isLoadingFromSheets}
                            className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground font-medium rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                          >
                            {isLoadingFromSheets ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Muat dari Sheets
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => loadDataFromSheets(true)}
                          disabled={isLoadingFromSheets}
                          className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {isLoadingFromSheets ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Coba Ulang Analisis
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentPage === "lokasi" && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Analisis Distribusi Lokasi Absensi</h3>
                
                {/* Filter Panel */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                  <h4 className="text-lg font-semibold mb-4">Filter</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="all">Semua Unit</option>
                        {[...new Set(data.map(r => r.Unit).filter(Boolean))].map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="all">Semua Status</option>
                        <option value="Hadir">Hadir</option>
                        <option value="Terlambat">Terlambat</option>
                        <option value="Izin">Izin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {uniqueDates.map((date) => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Peta Interaktif Lokasi Absensi</h4>
                  {data.length > 0 ? (
                    <InteractiveMap records={filteredData} selectedDate={selectedDate} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">Peta Lokasi Tidak Tersedia</h4>
                      <p className="text-muted-foreground max-w-sm">
                        Untuk melihat analisis lokasi, pastikan data absensi mengandung informasi koordinat atau alamat lengkap.
                      </p>
                    </div>
                  )}
                </div>

                {/* Location Statistics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Bar Chart - Jumlah Absensi per Lokasi */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Jumlah Absensi per Lokasi</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={unitChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="unit" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#003366" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Heatmap placeholder */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Intensitas Lokasi (Heatmap)</h4>
                    <div className="h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Heatmap visualisasi intensitas lokasi absensi</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentPage === "individu" && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Analisis Absensi Per Individu</h3>
                
                {/* Search Individual */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                  <h4 className="text-lg font-semibold mb-4">Cari Karyawan</h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Cari berdasarkan nama atau NRP..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Individual Profile Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {searchFilteredData.slice(0, 6).map((record, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                          <Users className="w-8 h-8 text-gray-600" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-900">{record.Nama}</h5>
                          <p className="text-sm text-gray-600">NRP: {record.NRP}</p>
                          <p className="text-sm text-gray-600">Unit: {record.Unit}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className={`text-sm font-medium ${
                            record.Status === 'Hadir' ? 'text-green-600' : 
                            record.Status === 'Terlambat' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {record.Status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Waktu:</span>
                          <span className="text-sm text-gray-900">{record["Waktu Absensi"]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Tanggal:</span>
                          <span className="text-sm text-gray-900">{record["Tanggal Absensi"]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Individual Analysis Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Trend Analysis */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Tren Absensi Harian</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={hourlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#003366" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Calendar View */}
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Kalender Status Absensi</h4>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                        <div key={day} className="p-2 font-medium text-gray-600">{day}</div>
                      ))}
                      {Array.from({length: 30}, (_, i) => (
                        <div key={i} className={`p-2 rounded ${
                          Math.random() > 0.7 ? 'bg-red-100 text-red-800' :
                          Math.random() > 0.5 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Individual Location Map */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Lokasi Absensi Individu</h4>
                  {searchFilteredData.length > 0 ? (
                    <InteractiveMap records={searchFilteredData.slice(0, 10)} selectedDate={selectedDate} />
                  ) : (
                    <p className="text-gray-500">Pilih karyawan untuk melihat lokasi absensi.</p>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="bg-[#D3D3D3] text-[#003366] h-[40px] flex items-center justify-between px-4">
            <p className="text-sm">© 2025 TIK Polda Lampung</p>
            <div className="flex space-x-4">
              <button className="text-sm hover:underline">Bantuan</button>
              <button className="text-sm hover:underline">Kontak</button>
            </div>
          </footer>

          {/* Hidden file inputs */}
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <input 
            ref={fileReplaceInputRef} 
            type="file" 
            accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
            onChange={handleFileReplace} 
            className="hidden" 
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
