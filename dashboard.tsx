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
  const [currentPage, setCurrentPage] = useState("dashboard")
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

  // Calculate features for clustering
  const calculateFeatures = useCallback((records: AttendanceRecord[]) => {
    // Filter only "Masuk" records for analysis
    const masukRecords = records.filter((record) => record["Jenis Absensi"] === "Masuk")

    if (masukRecords.length === 0) return []

    const personelStats: {
      [key: string]: {
        total_hadir: number
        total_terlambat: number
        total_izin: number
        total_masuk: number
        waktu_masuk: number[]
        akurasi_lokasi: number[]
        ip_addresses: Set<string>
        perangkat_ids: Set<string>
      }
    } = {}

    // Aggregate data per NRP
    masukRecords.forEach((record) => {
      const nrp = record.NRP || ""
      if (!personelStats[nrp]) {
        personelStats[nrp] = {
          total_hadir: 0,
          total_terlambat: 0,
          total_izin: 0,
          total_masuk: 0,
          waktu_masuk: [],
          akurasi_lokasi: [],
          ip_addresses: new Set(),
          perangkat_ids: new Set(),
        }
      }

      const stats = personelStats[nrp]
      stats.total_masuk += 1

      // Count status
      if (record.Status === "Tepat Waktu") stats.total_hadir += 1
      else if (record.Status === "Terlambat") stats.total_terlambat += 1
      else if (record.Status === "Izin") stats.total_izin += 1

      // Convert time to minutes from 00:00
      const waktuAbsensi = record["Waktu Absensi"] || "08:00"
      const timeParts = waktuAbsensi.split(":")
      const minutes = Number.parseInt(timeParts[0] || "8") * 60 + Number.parseInt(timeParts[1] || "0")
      stats.waktu_masuk.push(minutes)

      // Collect location accuracy
      const akurasi = Number.parseFloat(record["Akurasi Lokasi"] || "0") || 0
      if (akurasi > 0) stats.akurasi_lokasi.push(akurasi)

      // Collect unique IPs and devices
      if (record["Alamat IP"]) stats.ip_addresses.add(record["Alamat IP"])
      if (record["ID Perangkat"]) stats.perangkat_ids.add(record["ID Perangkat"])
    })

    // Calculate final features
    const features = Object.entries(personelStats).map(([nrp, stats]) => {
      const record = masukRecords.find((r) => r.NRP === nrp)!

      return {
        record,
        nrp,
        total_hadir: stats.total_hadir,
        total_terlambat: stats.total_terlambat,
        total_izin: stats.total_izin,
        total_masuk: stats.total_masuk,
        rata2_jam_masuk:
          stats.waktu_masuk.length > 0 ? stats.waktu_masuk.reduce((a, b) => a + b, 0) / stats.waktu_masuk.length : 480,
        rata2_akurasi_lokasi:
          stats.akurasi_lokasi.length > 0
            ? stats.akurasi_lokasi.reduce((a, b) => a + b, 0) / stats.akurasi_lokasi.length
            : 10,
        jumlah_ip_berbeda: stats.ip_addresses.size,
        jumlah_perangkat_berbeda: stats.perangkat_ids.size,
      }
    })

    // Normalize features for clustering
    if (features.length === 0) return []

    const normalizeFeature = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length)
      return values.map((v) => (std > 0 ? (v - mean) / std : 0))
    }

    const totalHadirNorm = normalizeFeature(features.map((f) => f.total_hadir))
    const totalTerlambatNorm = normalizeFeature(features.map((f) => f.total_terlambat))
    const totalIzinNorm = normalizeFeature(features.map((f) => f.total_izin))
    const rata2JamMasukNorm = normalizeFeature(features.map((f) => f.rata2_jam_masuk))
    const rata2AkurasiNorm = normalizeFeature(features.map((f) => f.rata2_akurasi_lokasi))
    const jumlahIpNorm = normalizeFeature(features.map((f) => f.jumlah_ip_berbeda))
    const jumlahPerangkatNorm = normalizeFeature(features.map((f) => f.jumlah_perangkat_berbeda))

    return features.map((f, i) => ({
      ...f,
      // Use composite score for clustering visualization
      avgArrivalTime: f.rata2_jam_masuk,
      tardinessRate: (f.total_terlambat / f.total_masuk) * 100,
      // Normalized features for actual clustering
      features: [
        totalHadirNorm[i],
        totalTerlambatNorm[i],
        totalIzinNorm[i],
        rata2JamMasukNorm[i],
        rata2AkurasiNorm[i],
        jumlahIpNorm[i],
        jumlahPerangkatNorm[i],
      ],
    }))
  }, [])

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
        const errorData = await response.json();
        throw new Error(errorData.error || `K-Means API request failed with status ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setClusterLabels(result.cluster_labels || []);
      setBackendClusterCenters(result.cluster_centers || []);
      // Store the features that were sent for clustering, to align with labels
      // This assumes calculateFeatures() returns an array of objects, and we extract 'features' array from each
      // For now, storing the raw numerical features sent.
      // setPersonnelFeatures(featuresToCluster); // Storing the raw numerical features.
                                             // Or store the full feature objects if needed for later mapping.
    } catch (error: any) {
      console.error("Error running K-Means backend:", error);
      setKmeansError(error.message || "Gagal menjalankan K-Means di backend.");
      setClusterLabels([]);
      setBackendClusterCenters([]);
    } finally {
      setIsKmeansLoading(false);
    }
  }, []);


  // This useEffect will be responsible for preparing data for visualization (the 'clusters' state)
  // once clusterLabels are available from the backend.
  useEffect(() => {
    if (data.length > 0 && personnelFeatures.length > 0 && clusterLabels.length === personnelFeatures.length) {
      // The `personnelFeatures` here should be the array of objects produced by `calculateFeatures`,
      // before extracting the numerical `features` array for the backend.
      // This mapping needs to be precise. Let's assume `calculateFeatures` produces an array of objects,
      // and we also store these original objects that correspond to `clusterLabels`.

      // For now, let's adjust `calculateFeatures` to return an object that also includes the original record
      // or enough info to map back. The `personnelFeatures` state should store these.

      const newClustersForVisualization: ClusterPoint[] = personnelFeatures.map((featureSet, index) => ({
        x: featureSet.avgArrivalTime, // Visualization X-coordinate
        y: featureSet.tardinessRate,  // Visualization Y-coordinate
        cluster: clusterLabels[index], // Label from backend
        record: featureSet.record,     // Original record associated with this feature set
        features: featureSet.features, // Numerical features (already normalized by backend or raw if preferred)
      }));
      setClusters(newClustersForVisualization);

      // Update visualization cluster centers (optional, could also use backendClusterCenters if scaled appropriately)
      // This calculates centroids based on the visualization coordinates (avgArrivalTime, tardinessRate)
      const newVisCenters: ClusterCenter[] = [];
      for (let i = 0; i < kValue; i++) {
        const pointsInCluster = newClustersForVisualization.filter(p => p.cluster === i);
        if (pointsInCluster.length > 0) {
          const avgX = pointsInCluster.reduce((sum, p) => sum + p.x, 0) / pointsInCluster.length;
          const avgY = pointsInCluster.reduce((sum, p) => sum + p.y, 0) / pointsInCluster.length;
          newVisCenters.push({ x: avgX, y: avgY });
        } else {
          // Handle empty cluster for visualization center (e.g., place it far off or use a default)
           // Or use a more sophisticated way if backendClusterCenters can be unscaled
          newVisCenters.push({ x: 0, y: 0});
        }
      }
      setClusterCenters(newVisCenters);

    } else if (clusterLabels.length === 0 && personnelFeatures.length > 0) {
      // If labels are cleared but features were there, clear visualization too
      setClusters([]);
      setClusterCenters([]);
    }
  }, [clusterLabels, personnelFeatures, data, kValue]);


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

    const clusterSummary = Array.from({ length: kValue }, (_, i) => {
      // Filter points belonging to the current cluster from the `clusters` state (which has backend labels)
      const clusterPoints = clusters.filter((p) => p.cluster === i);
      if (clusterPoints.length === 0) return null;

      // The `clusterPoints` already contain the original record and calculated features for visualization (x, y)
      // We need to ensure the `personnelFeatures` (which `calculateFeatures` produced)
      // are correctly mapped to these `clusterPoints` if we need more detailed features
      // than just x and y for the summary.

      // Let's re-access the full feature objects for the summary
      // This assumes `personnelFeatures` state holds the array of objects { record, nrp, ..., features: [...] }
      // and `clusterLabels` correctly maps to this array.

      const membersInCluster = personnelFeatures.filter((pf, index) => clusterLabels[index] === i);

      if (membersInCluster.length === 0) return null;


      const avgArrival = membersInCluster.reduce((sum, pf) => sum + pf.avgArrivalTime, 0) / membersInCluster.length;
      const avgTardiness = membersInCluster.reduce((sum, pf) => sum + pf.tardinessRate, 0) / membersInCluster.length;
      const avgHadir = membersInCluster.reduce((sum, pf) => sum + pf.total_hadir, 0) / membersInCluster.length;
      const avgTerlambat = membersInCluster.reduce((sum, pf) => sum + pf.total_terlambat, 0) / membersInCluster.length;
      const avgIzin = membersInCluster.reduce((sum, pf) => sum + pf.total_izin, 0) / membersInCluster.length;
      const avgAkurasi = membersInCluster.reduce((sum, pf) => sum + pf.rata2_akurasi_lokasi, 0) / membersInCluster.length;
      const avgIpBerbeda = membersInCluster.reduce((sum, pf) => sum + pf.jumlah_ip_berbeda, 0) / membersInCluster.length;
      const avgPerangkatBerbeda = membersInCluster.reduce((sum, pf) => sum + pf.jumlah_perangkat_berbeda, 0) / membersInCluster.length;


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
          nama: pf.record.Nama || "",
          unit: pf.record.Unit || "",
          nrp: pf.record.NRP || "",
        })),
        unitDistribution: membersInCluster.reduce(
          (acc, pf) => {
            const unit = pf.record.Unit || "Unknown";
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

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clusterSummary }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate analysis")
      }

      const result = await response.json()
      setAiAnalysis(result.analysis)
    } catch (error) {
      console.error("Error generating AI analysis:", error)
      setAiAnalysis("<p>Error generating analysis. Please check your API configuration and try again.</p>")
    } finally {
      setIsAnalyzing(false)
    }
  }, [clusters, kValue, data, calculateFeatures])

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
    <>
    {/* <SidebarProvider> */}
      {/* <div className="min-h-screen bg-gray-50 flex"> */}
        {/* Sidebar */}
        {/* <Sidebar> */}
          {/* <SidebarHeader> */}
            {/* <div className="flex items-center space-x-3 p-4"> */}
              {/* <img */}
                {/* src="https://pbj.divtik.polri.go.id/media/logos/logo-div-tik.png" // Updated sidebar logo */}
                {/* alt="TIK Polda Logo" */}
                {/* className="h-10 w-10 rounded-full object-contain" // Changed to object-contain for better aspect ratio handling */}
              {/* /> */}
              {/* <div> */}
                {/* <h1 className="text-lg font-bold text-gray-900">Dashboard</h1> */}
                {/* <p className="text-sm text-gray-600">TIK Polda</p> */}
              {/* </div> */}
            {/* </div> */}
          {/* </SidebarHeader> */}

          {/* <SidebarContent> */}
            {/* <SidebarGroup> */}
              {/* <SidebarGroupLabel>Menu Utama</SidebarGroupLabel> */}
              {/* <SidebarGroupContent> */}
                {/* <SidebarMenu> */}
                  {/* {[ */}
                    {/* { id: "dashboard", label: "Dasbor", icon: BarChart3 }, */}
                    {/* { id: "table", label: "Tabel Data", icon: Table }, */}
                    {/* { id: "cluster", label: "Analisis Klaster", icon: Scatter3D }, */}
                    {/* { id: "input", label: "Input Data", icon: Plus }, */}
                  {/* ].map(({ id, label, icon: Icon }) => ( */}
                    {/* <SidebarMenuItem key={id}> */}
                      {/* <SidebarMenuButton */}
                        {/* onClick={() => handlePageChange(id)} */}
                        {/* isActive={currentPage === id} */}
                        {/* className="w-full justify-start" */}
                      {/* > */}
                        {/* <Icon className="w-4 h-4" /> */}
                        {/* <span>{label}</span> */}
                      {/* </SidebarMenuButton> */}
                    {/* </SidebarMenuItem> */}
                  {/* ))} */}
                {/* </SidebarMenu> */}
              {/* </SidebarGroupContent> */}
            {/* </SidebarGroup> */}

            {/* <SidebarGroup> */}
              {/* <SidebarGroupLabel>Aksi Data</SidebarGroupLabel> */}
              {/* <SidebarGroupContent> */}
                {/* <SidebarMenu> */}
                  {/* <SidebarMenuItem> */}
                    {/* <SidebarMenuButton */}
                      {/* onClick={() => loadDataFromSheets(true)} */}
                      {/* disabled={isLoadingFromSheets} */}
                      {/* className="w-full justify-start" */}
                    {/* > */}
                      {/* {isLoadingFromSheets ? ( */}
                        {/* <Loader2 className="w-4 h-4 animate-spin" /> */}
                      {/* ) : ( */}
                        {/* <RefreshCw className="w-4 h-4" /> */}
                      {/* )} */}
                      {/* <span>Refresh Data</span> */}
                    {/* </SidebarMenuButton> */}
                  {/* </SidebarMenuItem> */}

                  {/* <SidebarMenuItem> */}
                    {/* <SidebarMenuButton */}
                      {/* onClick={() => fileInputRef.current?.click()} */}
                      {/* disabled={isUploadingToSheets} */}
                      {/* className="w-full justify-start" */}
                    {/* > */}
                      {/* {isUploadingToSheets ? ( */}
                        {/* <Loader2 className="w-4 h-4 animate-spin" /> */}
                      {/* ) : ( */}
                        {/* <Upload className="w-4 h-4" /> */}
                      {/* )} */}
                      {/* <span>Tambah Data</span> */}
                    {/* </SidebarMenuButton> */}
                  {/* </SidebarMenuItem> */}

                  {/* <SidebarMenuItem> */}
                    {/* <SidebarMenuButton */}
                      {/* onClick={() => fileReplaceInputRef.current?.click()} */}
                      {/* disabled={isUploadingToSheets} */}
                      {/* className="w-full justify-start" */}
                    {/* > */}
                      {/* {isUploadingToSheets ? ( */}
                        {/* <Loader2 className="w-4 h-4 animate-spin" /> */}
                      {/* ) : ( */}
                        {/* <Upload className="w-4 h-4" /> */}
                      {/* )} */}
                      {/* <span>Ganti Data</span> */}
                    {/* </SidebarMenuButton> */}
                  {/* </SidebarMenuItem> */}

                  {/* <SidebarMenuItem> */}
                    {/* <SidebarMenuButton */}
                      {/* onClick={uploadToSheets} */}
                      {/* disabled={isUploadingToSheets || data.length === 0} */}
                      {/* className="w-full justify-start" */}
                    {/* > */}
                      {/* {isUploadingToSheets ? ( */}
                        {/* <Loader2 className="w-4 h-4 animate-spin" /> */}
                      {/* ) : ( */}
                        {/* <Upload className="w-4 h-4" /> */}
                      {/* )} */}
                      {/* <span>Sync Sheets</span> */}
                    {/* </SidebarMenuButton> */}
                  {/* </SidebarMenuItem> */}

                  {/* <SidebarMenuItem> */}
                    {/* <SidebarMenuButton */}
                      {/* onClick={handleClearData} */}
                      {/* className="w-full justify-start text-red-600 hover:text-red-700" */}
                    {/* > */}
                      {/* <Trash2 className="w-4 h-4" /> */}
                      {/* <span>Hapus Data</span> */}
                    {/* </SidebarMenuButton> */}
                  {/* </SidebarMenuItem> */}
                {/* </SidebarMenu> */}
              {/* </SidebarGroupContent> */}
            {/* </SidebarGroup> */}
          {/* </SidebarContent> */}

          {/* <SidebarFooter> */}
            {/* <div className="p-4 text-xs text-gray-500"> */}
              {/* <p>Data: {fileName || "Belum ada data"}</p> */}
              {/* <p>Records: {data.length}</p> */}
            {/* </div> */}
          {/* </SidebarFooter> */}
        {/* </Sidebar> */}

        {/* Main Content */}
        {/* <SidebarInset className="flex-1"> */}
          {/* Header with Sidebar Trigger */}
          {/* <header className="sticky top-0 z-50 bg-white shadow-md border-b"> */}
            {/* <div className="flex items-center justify-between h-16 px-4"> */}
              {/* <div className="flex items-center space-x-4"> */}
                {/* <SidebarTrigger /> */}
                    {/* <h2 className="text-xl font-semibold text-gray-900 capitalize"> */}
                      {/* {currentPage.replace("-", " ")} */}
                {/* </h2> */}
              {/* </div> */}
            {/* </div> */}
          {/* </header> */}

              {/* Status Messages */}
          {/* {sheetsStatus && ( */}
            {/* <div className="px-4 py-2"> */}
                  {/* <div className="p-3 bg-blue-100 border border-blue-300 text-blue-800 rounded-lg shadow-sm"> */}
                    {/* <p className="text-sm">{sheetsStatus}</p> */}
              {/* </div> */}
            {/* </div> */}
          {/* )} */}
              {/* {kmeansError && ( */}
                 {/* <div className="px-4 py-2"> */}
                    {/* <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg shadow-sm"> */}
                        {/* <p className="text-sm font-semibold">K-Means Error:</p> */}
                        {/* <p className="text-sm">{kmeansError}</p> */}
                    {/* </div> */}
                {/* </div> */}
              {/* )} */}
              {/* {isKmeansLoading && ( */}
                {/* <div className="px-4 py-2"> */}
                    {/* <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg shadow-sm flex items-center"> */}
                        {/* <Loader2 className="w-4 h-4 animate-spin mr-2" /> */}
                        {/* <p className="text-sm">Menjalankan K-Means di backend...</p> */}
                    {/* </div> */}
                {/* </div> */}
              {/* )} */}


          {/* Page Content */}
          {/* <main className={`transition-opacity duration-500 ${fadeClass} p-4`}> */}
            {/* {currentPage === "dashboard" && ( */}
              {/* <div> */}
                {/* File Info */}
                {/* <div className="mb-6 p-4 bg-blue-50 rounded-lg"> */}
                  {/* <p className="text-sm text-blue-800"> */}
                    {/* <strong>Sumber Data:</strong> {fileName || "Belum ada data"} | <strong>Total Records:</strong>{" "} */}
                    {/* {data.length} */}
                  {/* </p> */}
                {/* </div> */}

                    {/* Interactive Map */}
                    {/* <div className="mb-8 bg-white p-6 rounded-lg shadow-md"> */}
                      {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Peta Sebaran Absensi</h3> */}
                      {/* { data.length > 0 ? ( */}
                        {/* <InteractiveMap records={filteredData} selectedDate={selectedDate} /> */}
                      {/* ) : ( */}
                        {/* <p className="text-gray-500">Tidak ada data untuk ditampilkan di peta.</p> */}
                      {/* )} */}
                    {/* </div> */}

                {/* Data Statistics */}
                {/* <DataStats data={data} fileName={fileName} /> */}

                {/* Date Filter */}
                {/* {uniqueDates.length > 0 && ( */}
                  {/* <div className="mb-6"> */}
                    {/* <label className="block text-sm font-medium text-gray-700 mb-2">Filter Tanggal:</label> */}
                    {/* <select */}
                      {/* value={selectedDate} */}
                      {/* onChange={(e) => setSelectedDate(e.target.value)} */}
                      {/* className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" */}
                    {/* > */}
                      {/* {uniqueDates.map((date) => ( */}
                        {/* <option key={date} value={date}> */}
                          {/* {date} */}
                        {/* </option> */}
                      {/* ))} */}
                    {/* </select> */}
                  {/* </div> */}
                {/* )} */}

                {/* KPI Cards */}
                {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"> */}
                  {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                    {/* <div className="flex items-center"> */}
                      {/* <Users className="w-8 h-8 text-blue-600" /> */}
                      {/* <div className="ml-4"> */}
                        {/* <p className="text-sm font-medium text-gray-600">Total Kehadiran</p> */}
                        {/* <p className="text-2xl font-bold text-gray-900">{kpis.total}</p> */}
                      {/* </div> */}
                    {/* </div> */}
                  {/* </div> */}

                  {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                    {/* <div className="flex items-center"> */}
                      {/* <Clock className="w-8 h-8 text-green-600" /> */}
                      {/* <div className="ml-4"> */}
                        {/* <p className="text-sm font-medium text-gray-600">Hadir</p> */}
                        {/* <p className="text-2xl font-bold text-gray-900">{kpis.hadir}</p> */}
                      {/* </div> */}
                    {/* </div> */}
                  {/* </div> */}

                  {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                    {/* <div className="flex items-center"> */}
                      {/* <AlertTriangle className="w-8 h-8 text-red-600" /> */}
                      {/* <div className="ml-4"> */}
                        {/* <p className="text-sm font-medium text-gray-600">Terlambat</p> */}
                        {/* <p className="text-2xl font-bold text-gray-900">{kpis.terlambat}</p> */}
                      {/* </div> */}
                    {/* </div> */}
                  {/* </div> */}

                  {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                    {/* <div className="flex items-center"> */}
                      {/* <TrendingUp className="w-8 h-8 text-purple-600" /> */}
                      {/* <div className="ml-4"> */}
                        {/* <p className="text-sm font-medium text-gray-600">Tingkat Kehadiran</p> */}
                        {/* <p className="text-2xl font-bold text-gray-900">{kpis.hadirRate}%</p> */}
                      {/* </div> */}
                    {/* </div> */}
                  {/* </div> */}
                {/* </div> */}

                {/* Charts */}
                {/* {data.length > 0 && ( */}
                  {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"> */}
                    {/* Status Pie Chart */}
                    {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                      {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Status Kehadiran</h3> */}
                      {/* <ResponsiveContainer width="100%" height={300}> */}
                        {/* <PieChart> */}
                          {/* <Pie */}
                            {/* data={statusChartData} */}
                            {/* cx="50%" */}
                            {/* cy="50%" */}
                            {/* labelLine={false} */}
                            {/* label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} */}
                            {/* outerRadius={80} */}
                            {/* fill="#8884d8" */}
                            {/* dataKey="value" */}
                          {/* > */}
                            {/* {statusChartData.map((entry, index) => ( */}
                              {/* <Cell key={`cell-${index}`} fill={entry.color} /> */}
                            {/* ))} */}
                          {/* </Pie> */}
                          {/* <Tooltip /> */}
                        {/* </PieChart> */}
                      {/* </ResponsiveContainer> */}
                    {/* </div> */}

                    {/* Unit Bar Chart */}
                    {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                      {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Kehadiran per Unit</h3> */}
                      {/* <ResponsiveContainer width="100%" height={300}> */}
                        {/* <BarChart data={unitChartData}> */}
                          {/* <CartesianGrid strokeDasharray="3 3" /> */}
                          {/* <XAxis dataKey="unit" /> */}
                          {/* <YAxis /> */}
                          {/* <Tooltip /> */}
                          {/* <Bar dataKey="count" fill="#0088FE" /> */}
                        {/* </BarChart> */}
                      {/* </ResponsiveContainer> */}
                    {/* </div> */}
                  {/* </div> */}
                {/* )} */}

                {/* Hourly Trend */}
                {/* {hourlyChartData.length > 0 && ( */}
                  {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                    {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Kehadiran per Jam</h3> */}
                    {/* <ResponsiveContainer width="100%" height={300}> */}
                      {/* <LineChart data={hourlyChartData}> */}
                        {/* <CartesianGrid strokeDasharray="3 3" /> */}
                        {/* <XAxis dataKey="hour" /> */}
                        {/* <YAxis /> */}
                        {/* <Tooltip /> */}
                        {/* <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} /> */}
                      {/* </LineChart> */}
                    {/* </ResponsiveContainer> */}
                  {/* </div> */}
                {/* )} */}

                {/* No Data Message */}
                {/* {data.length === 0 && ( */}
                  {/* <div className="bg-white p-8 rounded-lg shadow-md text-center"> */}
                    {/* <div className="text-gray-400 mb-4"> */}
                      {/* <BarChart3 className="w-16 h-16 mx-auto" /> */}
                    {/* </div> */}
                    {/* <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Data</h3> */}
                    {/* <p className="text-gray-600 mb-4"> */}
                      {/* Silakan unggah file CSV atau tambah data melalui menu Input Data untuk mulai menganalisis. */}
                    {/* </p> */}
                    {/* <button */}
                      {/* onClick={() => fileInputRef.current?.click()} */}
                      {/* className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" */}
                    {/* > */}
                      {/* <Upload className="w-4 h-4" /> */}
                      {/* <span>Unggah Data CSV</span> */}
                    {/* </button> */}
                  {/* </div> */}
                {/* )} */}
              {/* </div> */}
            {/* )} */}

            {/* {currentPage === "table" && ( */}
              {/* <div> */}
                {/* Search */}
                {/* <div className="mb-6"> */}
                  {/* <div className="relative"> */}
                    {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /> */}
                    {/* <input */}
                      {/* type="text" */}
                      {/* placeholder="Cari data..." */}
                      {/* value={searchTerm} */}
                      {/* onChange={(e) => setSearchTerm(e.target.value)} */}
                      {/* className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" */}
                    {/* /> */}
                  {/* </div> */}
                {/* </div> */}

                {/* Data Table */}
                {/* {data.length > 0 ? ( */}
                  {/* <div className="bg-white rounded-lg shadow-md overflow-hidden"> */}
                    {/* <div className="overflow-x-auto"> */}
                      {/* <table className="min-w-full divide-y divide-gray-200"> */}
                        {/* <thead className="bg-gray-50"> */}
                          {/* <tr> */}
                            {/* {Object.keys(data[0] || {}).map((header) => ( */}
                              {/* <th */}
                                {/* key={header} */}
                                {/* className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" */}
                              {/* > */}
                                {/* {header} */}
                              {/* </th> */}
                            {/* ))} */}
                          {/* </tr> */}
                        {/* </thead> */}
                        {/* <tbody className="bg-white divide-y divide-gray-200"> */}
                          {/* {searchFilteredData.map((record, index) => ( */}
                            {/* <tr key={index} className="hover:bg-gray-50"> */}
                              {/* {Object.entries(record).map(([key, value]) => ( */}
                                {/* <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"> */}
                                  {/* {key === "URL Foto" ? ( */}
                                    {/* <a */}
                                      {/* href={value} */}
                                      {/* target="_blank" */}
                                      {/* rel="noopener noreferrer" */}
                                      {/* className="text-blue-600 hover:text-blue-800" */}
                                    {/* > */}
                                      {/* Lihat Foto */}
                                    {/* </a> */}
                                  {/* ) : ( */}
                                    {/* value */}
                                  {/* )} */}
                                {/* </td> */}
                              {/* ))} */}
                            {/* </tr> */}
                          {/* ))} */}
                        {/* </tbody> */}
                      {/* </table> */}
                    {/* </div> */}
                  {/* </div> */}
                {/* ) : ( */}
                  {/* <div className="bg-white p-8 rounded-lg shadow-md text-center"> */}
                    {/* <div className="text-gray-400 mb-4"> */}
                      {/* <Table className="w-16 h-16 mx-auto" /> */}
                    {/* </div> */}
                    {/* <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Data</h3> */}
                    {/* <p className="text-gray-600">Silakan unggah data terlebih dahulu untuk melihat tabel.</p> */}
                  {/* </div> */}
                {/* )} */}
              {/* </div> */}
            {/* )} */}

            {/* {currentPage === "cluster" && ( */}
              {/* <div> */}
                {/* {data.length > 0 && clusterLabels.length > 0 && personnelFeatures.length > 0 ? ( */}
                  {/* <> */}
                    {/* K-Means Controls & Summary Cards */}
                    {/* <div className="mb-6 p-4 bg-white rounded-lg shadow-md"> */}
                      {/* <div className="flex flex-wrap items-center justify-between gap-4 mb-6"> */}
                        {/* <div className="flex items-center space-x-4"> */}
                          {/* <label htmlFor="kValueSelect" className="text-sm font-medium text-gray-700">Jumlah Klaster (K):</label> */}
                          {/* <select */}
                            {/* id="kValueSelect" */}
                            {/* value={kValue} */}
                            {/* onChange={(e) => setKValue(Number.parseInt(e.target.value))} */}
                            {/* disabled={isKmeansLoading} */}
                            {/* className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70" */}
                          {/* > */}
                            {/* {[2, 3, 4, 5].map((k) => ( */}
                              {/* <option key={k} value={k}> */}
                                {/* {k} */}
                              {/* </option> */}
                            {/* ))} */}
                          {/* </select> */}
                        {/* </div> */}
                        {/* <button */}
                          {/* onClick={generateAIAnalysis} */}
                          {/* disabled={isAnalyzing || isKmeansLoading || clusterLabels.length === 0} */}
                          {/* className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50" */}
                        {/* > */}
                          {/* {isAnalyzing ? ( */}
                            {/* <Loader2 className="w-4 h-4 animate-spin" /> */}
                          {/* ) : ( */}
                            {/* <Scatter3D className="w-4 h-4" /> / Consider a more AI-specific icon / */}
                          {/* )} */}
                          {/* <span>{isAnalyzing ? "Menganalisis..." : "Buat Analisis AI"}</span> */}
                        {/* </button> */}
                      {/* </div> */}

                      {/* Cluster Summary Cards */}
                      {/* Adjusted lg:grid-cols-kValue to a fixed number or a dynamic class based on kValue */}
                      {/* <div className={`grid grid-cols-1 md:grid-cols-2 ${kValue <= 4 ? `lg:grid-cols-${kValue}` : 'lg:grid-cols-4'} gap-4 mb-6`}> */}
                        {/* {Array.from({ length: kValue }, (_, i) => { */}
                          {/* const membersInThisCluster = personnelFeatures.filter((pf, index) => clusterLabels[index] === i); */}
                          {/* const clusterName = clusterNames[i] || `Klaster ${i + 1}`; */}
                          {/* return ( */}
                            {/* <div  */}
                              {/* key={`summary-card-${i}`} */}
                              {/* className="p-4 rounded-lg shadow-sm border" */}
                              {/* style={{ borderColor: COLORS[i % COLORS.length], backgroundColor: `${COLORS[i % COLORS.length]}1A` }} // Light background based on cluster color */}
                            {/* > */}
                              {/* <h4 className="text-md font-semibold mb-1" style={{ color: COLORS[i % COLORS.length] }}>{clusterName}</h4> */}
                              {/* <p className="text-2xl font-bold text-gray-800">{membersInThisCluster.length}</p> */}
                              {/* <p className="text-xs text-gray-600">Personel</p> */}
                            {/* </div> */}
                          {/* ); */}
                        {/* })} */}
                      {/* </div> */}
                    {/* </div> */}
                    
                    {/* Charts Side-by-Side: Pie Chart and Radar Chart */}
                    {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"> */}
                        {/* Pie Chart Distribusi Klaster */}
                        {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                             {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Personel per Klaster</h3> */}
                             {/* <ResponsiveContainer width="100%" height={300}> */}
                                {/* <PieChart> */}
                                    {/* <Pie */}
                                        {/* data={Array.from({ length: kValue }, (_, i) => ({ */}
                                            {/* name: clusterNames[i] || `Klaster ${i + 1}`, */}
                                            {/* value: clusterLabels.filter(label => label === i).length, */}
                                        {/* }))} */}
                                        {/* cx="50%" */}
                                        {/* cy="50%" */}
                                        {/* labelLine={false} */}
                                        {/* label={({ name, percent, value }) => value > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''} */}
                                        {/* outerRadius={100} */}
                                        {/* fill="#8884d8" */}
                                        {/* dataKey="value" */}
                                    {/* > */}
                                        {/* {Array.from({ length: kValue }, (_, i) => ( */}
                                            {/* <Cell key={`cell-pie-${i}`} fill={COLORS[i % COLORS.length]} /> */}
                                        {/* ))} */}
                                    {/* </Pie> */}
                                    {/* <Tooltip /> */}
                                    {/* <Legend /> */}
                                {/* </PieChart> */}
                            {/* </ResponsiveContainer> */}
                        {/* </div> */}

                        {/* Radar Chart Karakteristik Klaster */}
                        {/* <div className="bg-white p-6 rounded-lg shadow-md"> */}
                            {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Karakteristik Rata-rata Klaster</h3> */}
                            {/* <ResponsiveContainer width="100%" height={300}> */}
                                {/* <RadarChart cx="50%" cy="50%" outerRadius="80%" data={ */}
                                    {/* Array.from({ length: kValue }, (_, i) => { */}
                                        {/* const members = personnelFeatures.filter((pf, index) => clusterLabels[index] === i); */}
                                        {/* if (members.length === 0) return null; // Skip if no members */}

                                        {/* // Calculate average for each feature for this cluster */}
                                        {/* const avgTotalHadir = members.reduce((sum, m) => sum + m.total_hadir, 0) / members.length; */}
                                        {/* const avgTotalTerlambat = members.reduce((sum, m) => sum + m.total_terlambat, 0) / members.length; */}
                                        {/* const avgTotalIzin = members.reduce((sum, m) => sum + m.total_izin, 0) / members.length; */}
                                        {/* // Rata2 jam masuk is already an average, so we average the averages */}
                                        {/* const avgJamMasuk = members.reduce((sum, m) => sum + m.rata2_jam_masuk, 0) / members.length;  */}
                                        {/* const avgAkurasiLokasi = members.reduce((sum, m) => sum + m.rata2_akurasi_lokasi, 0) / members.length; */}
                                        {/* const avgIpBerbeda = members.reduce((sum, m) => sum + m.jumlah_ip_berbeda, 0) / members.length; */}
                                        {/* const avgPerangkatBerbeda = members.reduce((sum, m) => sum + m.jumlah_perangkat_berbeda, 0) / members.length; */}

                                        {/* return { */}
                                            {/* subject: clusterNames[i] || `Klaster ${i + 1}`, */}
                                            {/* A: avgTotalHadir, // "Total Hadir" */}
                                            {/* B: avgTotalTerlambat, // "Total Terlambat" */}
                                            {/* C: avgTotalIzin, // "Total Izin" */}
                                            {/* D: avgJamMasuk, // "Jam Masuk (avg min)" - convert to HH:MM for display if needed */}
                                            {/* E: avgAkurasiLokasi, // "Akurasi Lokasi (avg m)" */}
                                            {/* F: avgIpBerbeda, // "Variasi IP (avg)" */}
                                            {/* G: avgPerangkatBerbeda, // "Variasi Perangkat (avg)" */}
                                            {/* fullMark: Math.max( // Calculate fullMark dynamically based on max values across all clusters for each category */}
                                                {/* ...personnelFeatures.map(pf => pf.total_hadir), // Example for 'A' */}
                                                {/* ...personnelFeatures.map(pf => pf.total_terlambat), */}
                                                {/* ...personnelFeatures.map(pf => pf.total_izin), */}
                                                {/* 600, // Max jam masuk (e.g. 10:00 = 600 min) - adjust as needed */}
                                                {/* 100, // Max akurasi (e.g. 100m) - adjust */}
                                                {/* 10, // Max IP (e.g. 10) - adjust */}
                                                {/* 5   // Max perangkat - adjust */}
                                            {/* ) // This fullMark logic needs refinement for each axis */}
                                        {/* }; */}
                                    {/* }).filter(Boolean) // Remove null entries for clusters with no members */}
                                {/* }> */}
                                    {/* <PolarGrid /> */}
                                    {/* <PolarAngleAxis dataKey="subject" /> */}
                                    {/* <PolarRadiusAxis angle={30} domain={[0, 'auto']} /> / Adjust domain based on typical data ranges / */}
                                    
                                    {/* Define Radar for each metric - this part needs to be dynamic if comparing clusters directly on one chart */}
                                    {/* For now, this structure assumes 'subject' is the cluster and A, B, C are metrics. */}
                                        {/* If we want to show each cluster as a separate line, the data structure needs to be: */}
                                        {/* [ { metric: "Total Hadir", Klaster1: val1, Klaster2: val2 ... }, ... ] */}
                                        {/* Let's adjust for the current structure first, showing one radar per cluster if needed, or one radar comparing all. */}
                                        {/* The current data structure is for one radar per cluster. */}
                                        {/* To compare all clusters in one radar chart, we need to transform the data. */}

                                    
                                    {/* Example: One line per cluster, comparing metrics */}
                                    {/* {Array.from({ length: kValue }, (_, i) => { */}
                                        {/* // This check is actually done by .filter(Boolean) on the data prop already */}
                                        {/* // const members = personnelFeatures.filter((pf, index) => clusterLabels[index] === i); */}
                                        {/* // if (members.length === 0) return null; */}
                                        {/* return ( */}
                                            {/* <Radar  */}
                                                {/* key={`radar-${i}`} */}
                                                {/* name={clusterNames[i] || `Klaster ${i + 1}`}  */}
                                                {/* dataKey={clusterNames[i] || `Klaster ${i + 1}`} // This needs to match the transformed data structure */}
                                                {/* stroke={COLORS[i % COLORS.length]}  */}
                                                {/* fill={COLORS[i % COLORS.length]}  */}
                                                {/* fillOpacity={0.6}  */}
                                            {/* /> */}
                                        {/* ); */}
                                    {/* })} */}
                                    {/* This Radar setup is incorrect for comparing clusters. */}
                                        {/* The `data` prop of RadarChart should be an array of objects, */}
                                        {/* where each object represents a point on the angle axis (a metric). */}
                                        {/* Each object should then have keys for each cluster. */}
                                        {/* Example: */}
                                        {/* [ */}
                                          {/* { metric: 'Total Hadir', Klaster1: 10, Klaster2: 12, Klaster3: 8, fullMark: 15 }, */}
                                          {/* { metric: 'Keterlambatan', Klaster1: 2, Klaster2: 1, Klaster3: 5, fullMark: 5 }, */}
                                          {/* ... */}
                                        {/* ] */}

                                    {/* Correct Radar Implementation */}
                                    {/* {(() => { */}
                                        {/* const metrics = [ */}
                                            {/* { key: 'avgTotalHadir', name: 'Avg Hadir', max: 0}, */}
                                            {/* { key: 'avgTotalTerlambat', name: 'Avg Terlambat', max: 0 }, */}
                                            {/* { key: 'avgTotalIzin', name: 'Avg Izin', max: 0 }, */}
                                            {/* { key: 'avgJamMasuk', name: 'Avg Jam Masuk (min)', max: 0 }, // Max e.g., 18*60 = 1080 */}
                                            {/* { key: 'avgAkurasiLokasi', name: 'Avg Akurasi (m)', max: 0 }, // Max e.g., 100 */}
                                            {/* { key: 'avgIpBerbeda', name: 'Avg IP Unik', max: 0 }, */}
                                            {/* { key: 'avgPerangkatBerbeda', name: 'Avg Perangkat Unik', max: 0 } */}
                                        {/* ]; */}

                                        {/* const radarChartData = metrics.map(metric => { */}
                                            {/* const entry: any = { metric: metric.name }; */}
                                            {/* let currentMax = 0; */}
                                            {/* Array.from({ length: kValue }, (_, i) => { */}
                                                {/* const clusterKey = clusterNames[i] || `Klaster ${i + 1}`; */}
                                                {/* const members = personnelFeatures.filter((pf, index) => clusterLabels[index] === i); */}
                                                {/* if (members.length > 0) { */}
                                                    {/* let value = 0; */}
                                                    {/* switch (metric.key) { */}
                                                        {/* case 'avgTotalHadir': value = members.reduce((sum, m) => sum + m.total_hadir, 0) / members.length; break; */}
                                                        {/* case 'avgTotalTerlambat': value = members.reduce((sum, m) => sum + m.total_terlambat, 0) / members.length; break; */}
                                                        {/* case 'avgTotalIzin': value = members.reduce((sum, m) => sum + m.total_izin, 0) / members.length; break; */}
                                                        {/* case 'avgJamMasuk': value = members.reduce((sum, m) => sum + m.rata2_jam_masuk, 0) / members.length; break; */}
                                                        {/* case 'avgAkurasiLokasi': value = members.reduce((sum, m) => sum + m.rata2_akurasi_lokasi, 0) / members.length; break; */}
                                                        {/* case 'avgIpBerbeda': value = members.reduce((sum, m) => sum + m.jumlah_ip_berbeda, 0) / members.length; break; */}
                                                        {/* case 'avgPerangkatBerbeda': value = members.reduce((sum, m) => sum + m.jumlah_perangkat_berbeda, 0) / members.length; break; */}
                                                    {/* } */}
                                                    {/* entry[clusterKey] = parseFloat(value.toFixed(2)); */}
                                                    {/* if (entry[clusterKey] > currentMax) currentMax = entry[clusterKey]; */}
                                                {/* } else { */}
                                                    {/* entry[clusterKey] = 0; */}
                                                {/* } */}
                                            {/* }); */}
                                            {/* // A simple way to set fullMark, might need per-metric thought */}
                                            {/* entry.fullMark = currentMax > 0 ? Math.ceil(currentMax * 1.2) : 1; // Add 20% buffer or default to 1 */}
                                            {/* if (metric.key === 'avgJamMasuk') entry.fullMark = Math.max(currentMax, 600); // e.g. max 10:00 */}
                                            {/* if (metric.key === 'avgAkurasiLokasi') entry.fullMark = Math.max(currentMax, 50); // e.g. max 50m */}
                                            {/* return entry; */}
                                        {/* }); */}
                                        
                                        {/* if (radarChartData.every(d => metrics.every(m => d[(clusterNames[0] || `Klaster 1`)] === undefined))) { */}
                                            {/* return <p className="text-gray-500 text-center py-10">Data tidak cukup untuk Radar Chart.</p>; */}
                                        {/* } */}

                                        {/* return ( */}
                                            {/* <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}> */}
                                                {/* <PolarGrid /> */}
                                                {/* <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} /> */}
                                                {/* <PolarRadiusAxis angle={30} domain={[0, 'auto']} tickFormatter={(value) => value.toFixed(0)} /> */}
                                                {/* {Array.from({ length: kValue }, (_, i) => { */}
                                                    {/* const clusterNameKey = clusterNames[i] || `Klaster ${i + 1}`; */}
                                                     {/* // Check if this cluster has any data in the radarChartData */}
                                                    {/* if (radarChartData.some(d => d[clusterNameKey] !== undefined && d[clusterNameKey] > 0)) { */}
                                                        {/* return ( */}
                                                            {/* <Radar */}
                                                                {/* key={`radar-series-${i}`} */}
                                                                {/* name={clusterNameKey} */}
                                                                {/* dataKey={clusterNameKey} */}
                                                                {/* stroke={COLORS[i % COLORS.length]} */}
                                                                {/* fill={COLORS[i % COLORS.length]} */}
                                                                {/* fillOpacity={0.5} */}
                                                            {/* /> */}
                                                        {/* ); */}
                                                    {/* } */}
                                                    {/* return null; */}
                                                {/* })} */}
                                                {/* <Legend /> */}
                                                {/* <Tooltip /> */}
                                            {/* </RadarChart> */}
                                        {/* ); */}
                                    {/* })()} */}
                                {/* </ResponsiveContainer> */}
                        {/* </div> */}
                    {/* </div> */}

                    {/* Cluster Visualization (Scatter Plot) */}
                    {/* <div className="bg-white p-6 rounded-lg shadow-md mb-8"> */}
                      {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualisasi Pola Klaster (K-Means)</h3> */}
                      {/* <ResponsiveContainer width="100%" height={500}> */}
                        {/* <ScatterChart> */}
                          {/* <CartesianGrid strokeDasharray="3 3" /> */}
                          {/* <XAxis */}
                            {/* type="number" */}
                            {/* dataKey="x" */}
                            {/* name="Rata-rata Waktu Kedatangan (menit)" */}
                            {/* label={{ */}
                              {/* value: "Rata-rata Waktu Kedatangan (menit)", */}
                              {/* position: "insideBottom", */}
                              {/* offset: -10, */}
                            {/* }} */}
                          {/* /> */}
                          {/* <YAxis */}
                            {/* type="number" */}
                            {/* dataKey="y" */}
                            {/* name="Tingkat Keterlambatan (%)" */}
                            {/* label={{ value: "Tingkat Keterlambatan (%)", angle: -90, position: "insideLeft" }} */}
                          {/* /> */}
                          {/* <Tooltip */}
                            {/* cursor={{ strokeDasharray: "3 3" }} */}
                            {/* content={({ active, payload }) => { */}
                              {/* if (active && payload && payload[0]) { */}
                                {/* const data = payload[0].payload as ClusterPoint */}
                                {/* return ( */}
                                  {/* <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg"> */}
                                    {/* <p className="font-semibold">{data.record.Nama}</p> */}
                                    {/* <p>Unit: {data.record.Unit}</p> */}
                                    {/* <p>Klaster: {clusterNames[data.cluster]}</p> */}
                                    {/* <p> */}
                                      {/* Avg Kedatangan: {Math.floor(data.x / 60)}: */}
                                      {/* {String(Math.floor(data.x % 60)).padStart(2, "0")} */}
                                    {/* </p> */}
                                    {/* <p>Tingkat Terlambat: {data.y.toFixed(1)}%</p> */}
                                  {/* </div> */}
                                {/* ) */}
                              {/* } */}
                              {/* return null */}
                            {/* }} */}
                          {/* /> */}
                          {/* <Legend /> */}
                          {/* Render Scatter points based on `clusters` which now uses backend labels */}
                          {/* {Array.from({ length: kValue }, (_, i) => { */}
                            {/* const pointsInCluster = clusters.filter(p => p.cluster === i && (selectedCluster === null || selectedCluster === i)); */}
                            {/* if (pointsInCluster.length === 0 && !(selectedCluster === null || selectedCluster === i) ) return null; // Don't render if no points and not explicitly selected */}
                            
                            {/* return ( */}
                              {/* <Scatter */}
                                {/* key={`cluster-scatter-${i}`} */}
                                {/* name={clusterNames[i] || `Klaster ${i + 1}`} */}
                                {/* data={pointsInCluster} */}
                                {/* fill={COLORS[i % COLORS.length]} */}
                                {/* onClick={() => setSelectedCluster(selectedCluster === i ? null : i)} */}
                                {/* style={{ cursor: "pointer" }} */}
                              {/* /> */}
                            {/* ); */}
                          {/* })} */}
                        {/* </ScatterChart> */}
                      {/* </ResponsiveContainer> */}

                      {/* Cluster Legend */}
                      {/* <div className="mt-4 flex flex-wrap gap-4"> */}
                        {/* {Array.from({ length: kValue }, (_, i) => { */}
                          {/* // Count members directly from `clusterLabels` and `personnelFeatures` */}
                          {/* // to ensure it reflects the backend output accurately. */}
                          {/* const clusterMemberCount = clusterLabels.filter(label => label === i).length; */}
                          {/* return ( */}
                            {/* <button */}
                              {/* key={`legend-btn-${i}`} */}
                              {/* onClick={() => setSelectedCluster(selectedCluster === i ? null : i)} */}
                              {/* disabled={isKmeansLoading} */}
                              {/* className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${ */}
                                {/* selectedCluster === i */}
                                  {/* ? "bg-gray-200 border-gray-500 ring-2 ring-gray-500" */}
                                  {/* : "border-gray-300 hover:bg-gray-100" */}
                              {/* } ${isKmeansLoading ? "opacity-50 cursor-not-allowed" : ""}`} */}
                            {/* > */}
                              {/* <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /> */}
                              {/* <span className="text-sm font-medium"> */}
                                {/* {clusterNames[i] || `Klaster ${i + 1}`} ({clusterMemberCount}) */}
                              {/* </span> */}
                            {/* </button> */}
                          {/* ); */}
                        {/* })} */}
                      {/* </div> */}
                    {/* </div> */}

                    {/* Interactive Personnel Table */}
                    {/* <div className="bg-white p-6 rounded-lg shadow-md mt-8"> */}
                        {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Personel per Klaster</h3> */}
                        {/* Filters: Cluster, Unit, Name Search */}
                        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"> */}
                            {/* Cluster Filter */}
                            {/* <div> */}
                                {/* <label htmlFor="tableClusterFilter" className="block text-sm font-medium text-gray-700">Filter Klaster:</label> */}
                                {/* <select  */}
                                    {/* id="tableClusterFilter" */}
                                    {/* value={tableClusterFilter}  */}
                                    {/* onChange={(e) => setTableClusterFilter(e.target.value)} */}
                                    {/* disabled={isKmeansLoading || personnelFeatures.length === 0} */}
                                    {/* className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70" */}
                                {/* > */}
                                    {/* <option value="all">Semua Klaster</option> */}
                                    {/* {Array.from({ length: kValue }, (_, i) => ( */}
                                        {/* <option key={`filter-opt-${i}`} value={i}> */}
                                            {/* {clusterNames[i] || `Klaster ${i + 1}`} */}
                                        {/* </option> */}
                                    {/* ))} */}
                                {/* </select> */}
                            {/* </div> */}
                            {/* Unit Filter (Dropdown of unique units) */}
                            {/* <div> */}
                                {/* <label htmlFor="tableUnitFilter" className="block text-sm font-medium text-gray-700">Filter Unit Kerja:</label> */}
                                {/* <select  */}
                                    {/* id="tableUnitFilter" */}
                                    {/* value={tableUnitFilter} */}
                                    {/* onChange={(e) => setTableUnitFilter(e.target.value)} */}
                                    {/* disabled={isKmeansLoading || personnelFeatures.length === 0} */}
                                    {/* className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70" */}
                                {/* > */}
                                    {/* <option value="all">Semua Unit</option> */}
                                    {/* {[...new Set(personnelFeatures.map(pf => pf.record.Unit || "Tidak Diketahui"))].sort().map(unit => ( */}
                                        {/* <option key={unit} value={unit}>{unit}</option> */}
                                    {/* ))} */}
                                {/* </select> */}
                            {/* </div> */}
                            {/* Name Search */}
                            {/* <div> */}
                                {/* <label htmlFor="tableNameSearch" className="block text-sm font-medium text-gray-700">Cari Nama Personel:</label> */}
                                {/* <input  */}
                                    {/* type="text"  */}
                                    {/* id="tableNameSearch" */}
                                    {/* value={tableNameSearchTerm} */}
                                    {/* onChange={(e) => setTableNameSearchTerm(e.target.value)} */}
                                    {/* disabled={isKmeansLoading || personnelFeatures.length === 0} */}
                                    {/* className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-70" */}
                                    {/* placeholder="Ketik nama..." */}
                                {/* /> */}
                            {/* </div> */}
                        {/* </div> */}

                        {/* Table */}
                        {/* <div className="overflow-x-auto"> */}
                            {/* <table className="min-w-full divide-y divide-gray-200"> */}
                                {/* <thead className="bg-gray-50"> */}
                                    {/* <tr> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NRP</th> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klaster</th> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Jam Masuk</th> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Terlambat</th> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Izin</th> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Unik</th> */}
                                        {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Unik</th> */}
                                    {/* </tr> */}
                                {/* </thead> */}
                                {/* <tbody className="bg-white divide-y divide-gray-200"> */}
                                    {/* {(() => { */}
                                        {/* const filteredPersonnel = personnelFeatures */}
                                            {/* .map((pf, index) => ({ ...pf, clusterLabel: clusterLabels[index] })) // Add clusterLabel to each personnel feature object */}
                                            {/* .filter(pf =>  */}
                                                {/* (tableClusterFilter === "all" || (pf.clusterLabel !== undefined && pf.clusterLabel.toString() === tableClusterFilter)) && */}
                                                {/* (tableUnitFilter === "all" || (pf.record.Unit || "Tidak Diketahui") === tableUnitFilter) && */}
                                                {/* (tableNameSearchTerm === "" || (pf.record.Nama || "").toLowerCase().includes(tableNameSearchTerm.toLowerCase())) */}
                                            {/* ); */}

                                        {/* if (filteredPersonnel.length === 0) { */}
                                            {/* return ( */}
                                                {/* <tr> */}
                                                    {/* <td colSpan={9} className="text-center py-4 text-gray-500"> */}
                                                        {/* Tidak ada data personel yang cocok dengan filter. */}
                                                    {/* </td> */}
                                                {/* </tr> */}
                                            {/* ); */}
                                        {/* } */}

                                        {/* return filteredPersonnel.map((pf, index) => ( */}
                                            {/* <tr key={pf.nrp || `person-${index}-${pf.clusterLabel}`}> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.record.NRP}</td> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">{pf.record.Nama}</td> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.record.Unit || "Tidak Diketahui"}</td> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm"> */}
                                                    {/* <span  */}
                                                        {/* className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" */}
                                                        {/* style={{ */}
                                                            {/* backgroundColor: `${COLORS[pf.clusterLabel % COLORS.length]}33`,  */}
                                                            {/* color: COLORS[pf.clusterLabel % COLORS.length] */}
                                                        {/* }} */}
                                                    {/* > */}
                                                        {/* {clusterNames[pf.clusterLabel] || `Klaster ${pf.clusterLabel + 1}`} */}
                                                    {/* </span> */}
                                                {/* </td> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700"> */}
                                                    {/* {`${Math.floor(pf.rata2_jam_masuk / 60)}:${String(Math.floor(pf.rata2_jam_masuk % 60)).padStart(2, "0")}`} */}
                                                {/* </td> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.total_terlambat}</td> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.total_izin}</td> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.jumlah_ip_berbeda}</td> */}
                                                {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{pf.jumlah_perangkat_berbeda}</td> */}
                                            {/* </tr> */}
                                        {/* )); */}
                                    {/* })()} */}
                                {/* </tbody> */}
                            {/* </table> */}
                        {/* </div> */}
                         {/* {(personnelFeatures.length === 0 && !isKmeansLoading) && <p className="text-center text-gray-500 py-4">Tidak ada data personel untuk ditampilkan.</p>} */}
                    {/* </div> */}

                    {/* AI Analysis */}
                    {/* {aiAnalysis && !isAnalyzing && ( */}
                      {/* <div className="bg-white p-6 rounded-lg shadow-md mt-8"> */}
                        {/* <h3 className="text-lg font-semibold text-gray-900 mb-4">Insight Analisis AI</h3> */}
                        {/* <div  */}
                          {/* className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none"  */}
                          {/* dangerouslySetInnerHTML={{ __html: aiAnalysis || "<p>Belum ada analisis AI.</p>" }}  */}
                        {/* /> */}
                      {/* </div> */}
                    {/* )} */}
                     {/* {isAnalyzing && ( */}
                        {/* <div className="mt-8 flex items-center justify-center p-6 bg-white rounded-lg shadow-md"> */}
                            {/* <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" /> */}
                            {/* <p className="text-lg text-gray-700">Memproses analisis AI, mohon tunggu...</p> */}
                        {/* </div> */}
                    {/* )} */}
                  {/* </> */}
                {/* ) : ( */}
                  {/* <div className="bg-white p-8 rounded-lg shadow-md text-center"> */}
                    {/* <div className="text-gray-400 mb-4"> */}
                      {/* <Scatter3D className="w-16 h-16 mx-auto" /> */}
                    {/* </div> */}
                    {/* <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Data untuk Analisis Klaster</h3> */}
                    {/* <p className="text-gray-600 mb-2"> */}
                      {/* Pastikan data telah diunggah dan proses K-Means (jika ada error) telah berhasil. */}
                    {/* </p> */}
                    {/* { kmeansError && <p className="text-red-500 text-sm">Error K-Means: {kmeansError}</p>} */}
                    {/* { data.length === 0 &&  */}
                        {/* <p className="text-gray-600 mt-2"> */}
                            {/* Silakan unggah data terlebih dahulu. */}
                        {/* </p> */}
                    {/* } */}
                  {/* </div> */}
                {/* )} */}
              {/* </div> */}
            {/* )} */}

            {/* {currentPage === "input" && ( */}
              {/* <div> */}
                {/* <DataInput data={data} onDataChange={setData} onStatusChange={setSheetsStatus} /> */}
              {/* </div> */}
            {/* )} */}
          {/* </main> */}

          {/* Hidden file inputs */}
          {/* <input  */}
            {/* ref={fileInputRef}  */}
            {/* type="file"  */}
            {/* accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"  */}
            {/* onChange={handleFileUpload}  */}
            {/* className="hidden"  */}
          {/* /> */}
          {/* <input  */}
            {/* ref={fileReplaceInputRef}  */}
            {/* type="file"  */}
            {/* accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"  */}
            {/* onChange={handleFileReplace}  */}
            {/* className="hidden"  */}
          {/* /> */}
        {/* </SidebarInset> */}
      {/* </div> */}
    {/* </SidebarProvider> */}
    </>
  )
}
