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
  // ScatterChart, // Dipindahkan ke ClusterAnalysisView
  // Scatter, // Dipindahkan ke ClusterAnalysisView
  XAxis, // Masih digunakan oleh chart di Beranda
  YAxis, // Masih digunakan oleh chart di Beranda
  CartesianGrid, // Masih digunakan oleh chart di Beranda
  Tooltip, // Masih digunakan oleh chart di Beranda
  Legend, // Masih digunakan oleh chart di Beranda
  ResponsiveContainer, // Masih digunakan oleh chart di Beranda
  // RadarChart, // Dipindahkan ke ClusterAnalysisView
  // Radar, // Dipindahkan ke ClusterAnalysisView
  // PolarGrid, // Dipindahkan ke ClusterAnalysisView
  // PolarAngleAxis, // Dipindahkan ke ClusterAnalysisView
  // PolarRadiusAxis, // Dipindahkan ke ClusterAnalysisView
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
import { parseFileData, calculateFeatures as calculateFeaturesUtil } from "@/lib/dataProcessor" // Impor fungsi utilitas
import KpiCardsGrid from "@/components/dashboard/KpiCardsGrid" 
import DashboardControls from "@/components/dashboard/DashboardControls" 
import ClusterAnalysisView from "@/components/cluster-analysis-view" // Impor ClusterAnalysisView

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"] // Mungkin tidak lagi dibutuhkan di sini jika hanya dipakai di ClusterAnalysisView

interface AttendanceRecord { // Interface ini juga ada di dataProcessor.ts. Pertimbangkan untuk memindahkannya ke file types.ts global.
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

// interface ClusterPoint { ... } // Dipindahkan ke ClusterAnalysisView
// interface ClusterCenter { ... } // Dipindahkan ke ClusterAnalysisView

export default function DashboardTIKPolda() {
  const [currentPage, setCurrentPage] = useState("beranda")
  // const [data, setData] = useState<AttendanceRecord[]>([]) // Diganti oleh dashboardState
  // const [fileName, setFileName] = useState("") // Akan menjadi bagian dari dashboardState atau dikelola terpisah jika hanya UI
  const [selectedDate, setSelectedDate] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  // const [kValue, setKValue] = useState(3) // Dipindahkan ke ClusterAnalysisView
  // State for K-Means results from backend - DIPINDAHKAN ke ClusterAnalysisView
  // const [personnelFeatures, setPersonnelFeatures] = useState<any[]>([])
  // const [clusterLabels, setClusterLabels] = useState<number[]>([])
  // const [backendClusterCenters, setBackendClusterCenters] = useState<number[][]>([])
  // const [isKmeansLoading, setIsKmeansLoading] = useState(false)
  // const [kmeansError, setKmeansError] = useState<string | null>(null)

  // State for frontend visualization of clusters - DIPINDAHKAN ke ClusterAnalysisView
  // const [clusters, setClusters] = useState<ClusterPoint[]>([])
  // const [clusterCenters, setClusterCenters] = useState<ClusterCenter[]>([]) 
  // const [selectedCluster, setSelectedCluster] = useState<number | null>(null)

  // State for table filters in Cluster Analysis page - DIPINDAHKAN ke ClusterAnalysisView
  // const [tableClusterFilter, setTableClusterFilter] = useState<string>("all");
  // const [tableUnitFilter, setTableUnitFilter] = useState<string>("all");
  // const [tableNameSearchTerm, setTableNameSearchTerm] = useState<string>("");

  // const [aiAnalysis, setAiAnalysis] = useState("") // Dipindahkan ke ClusterAnalysisView
  // const [isAnalyzing, setIsAnalyzing] = useState(false) // Dipindahkan ke ClusterAnalysisView
  const [fadeClass, setFadeClass] = useState("opacity-100")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileReplaceInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingToSheets, setIsUploadingToSheets] = useState(false) // Ini mungkin perlu diintegrasikan atau tetap terpisah jika spesifik untuk UI upload
  // const [sheetsStatus, setSheetsStatus] = useState("") // Akan digantikan sebagian oleh dashboardState.error atau status UI spesifik
  // const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false) // Diganti oleh dashboardState.status

  // State tunggal untuk data utama dasbor
  type DashboardStatus = 'idle' | 'loading' | 'success' | 'error';
  interface DashboardState {
    status: DashboardStatus;
    data: AttendanceRecord[];
    fileName: string; // Memasukkan fileName ke sini
    error: string | null;
    // sheetsStatusMessage: string | null; // Untuk pesan status spesifik Google Sheets
  }

  const [dashboardState, setDashboardState] = useState<DashboardState>({
    status: 'idle', // Mulai dengan idle, atau 'loading' jika loadDataFromSheets dipanggil langsung
    data: [],
    fileName: "",
    error: null,
    // sheetsStatusMessage: null,
  });


  // Load data from Google Sheets on mount and refresh data
  const loadDataFromSheets = useCallback(async (showStatusMessage = true) => {
    // if (showStatusMessage) { // showStatusMessage bisa digunakan untuk menampilkan pesan UI sementara
    //   setDashboardState(prev => ({ ...prev, status: 'loading', error: null, sheetsStatusMessage: "📊 Memuat data dari Google Sheets..."}));
    // } else {
    //   setDashboardState(prev => ({ ...prev, status: 'loading', error: null }));
    // }
    setDashboardState(prev => ({ 
        ...prev, 
        status: 'loading', 
        error: null, 
        // sheetsStatusMessage: showStatusMessage ? "📊 Memuat data dari Google Sheets..." : prev.sheetsStatusMessage 
    }));


    try {
      const response = await fetch("/api/sheets")
      if (response.ok) {
        const result = await response.json()
        if (result.data && result.data.length > 0) {
          setDashboardState({
            status: 'success',
            data: result.data,
            fileName: "Google Sheets Data",
            error: null,
            // sheetsStatusMessage: showStatusMessage ? `✅ Berhasil memuat ${result.data.length} record dari Google Sheets` : null,
          });
          localStorage.setItem("tikPolda_data", JSON.stringify(result.data))
          localStorage.setItem("tikPolda_fileName", "Google Sheets Data")
        } else {
          // Tidak ada data di Sheets, coba localStorage
          const savedData = localStorage.getItem("tikPolda_data")
          const savedFileName = localStorage.getItem("tikPolda_fileName")
          if (savedData && savedFileName) {
            setDashboardState({
              status: 'success',
              data: JSON.parse(savedData),
              fileName: savedFileName,
              error: null,
              // sheetsStatusMessage: showStatusMessage ? "💾 Memuat data dari penyimpanan lokal (Sheets kosong)" : null,
            });
          } else {
            // Tidak ada data sama sekali
            setDashboardState({
              status: 'idle', // Atau 'success' dengan data kosong jika itu lebih make sense
              data: [],
              fileName: "",
              error: null, // Tidak error, hanya tidak ada data
              // sheetsStatusMessage: showStatusMessage ? "📝 Tidak ada data di Google Sheets maupun lokal" : null,
            });
          }
        }
      } else {
        throw new Error(`Gagal memuat dari Google Sheets: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error loading initial data:", error)
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui";
      // Coba localStorage sebagai fallback jika ada error API
      const savedData = localStorage.getItem("tikPolda_data")
      const savedFileName = localStorage.getItem("tikPolda_fileName")
      if (savedData && savedFileName) {
        setDashboardState({
          status: 'success', // Data dari local storage dianggap success
          data: JSON.parse(savedData),
          fileName: savedFileName,
          error: errorMessage, // Simpan error API meskipun fallback berhasil
          // sheetsStatusMessage: showStatusMessage ? `💾 Memuat data dari penyimpanan lokal (API error: ${errorMessage})` : null,
        });
      } else {
        setDashboardState({
          status: 'error',
          data: [],
          fileName: "",
          error: errorMessage,
          // sheetsStatusMessage: showStatusMessage ? `❌ Gagal memuat data: ${errorMessage}` : null,
        });
      }
    } 
    // finally {
      // Logika untuk menghapus sheetsStatusMessage setelah beberapa detik bisa ditambahkan di sini jika diperlukan
      // if (showStatusMessage) {
      //   setTimeout(() => {
      //     setDashboardState(prev => ({ ...prev, sheetsStatusMessage: null }));
      //   }, 5000);
      // }
    // }
  }, [])

  // Load data on component mount
  useEffect(() => {
    // Set status ke loading sebelum memanggil loadDataFromSheets
    // agar UI bisa langsung merespons dengan state loading awal.
    setDashboardState(prev => ({ ...prev, status: 'loading'}));
    loadDataFromSheets(true)
  }, [loadDataFromSheets])

  // Set initial selected date when data changes
  useEffect(() => {
    if (dashboardState.status === 'success' && dashboardState.data.length > 0 && !selectedDate) {
      const dates = [...new Set(dashboardState.data.map((record) => record["Tanggal Absensi"] || "").filter(Boolean))]
      if (dates.length > 0) {
        setSelectedDate(dates[0])
      }
    }
  }, [dashboardState.status, dashboardState.data, selectedDate])

  // parseFileData sekarang diimpor dari lib/dataProcessor
  // const parseFileData = useCallback(async (file: File): Promise<AttendanceRecord[]> => { ... }); // Dihapus

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // setSheetsStatus(`🔄 Memproses file ${file.name}...`); // Akan diganti dengan state UI yang lebih spesifik jika perlu
      try {
        const newParsedData = await parseFileData(file); // Menggunakan parseFileData dari utilitas

        if (newParsedData.length === 0) {
          // setSheetsStatus("❌ File kosong atau format tidak valid setelah parsing.");
          // setTimeout(() => setSheetsStatus(""), 3000);
          alert("File kosong atau format tidak valid setelah parsing."); // Contoh notifikasi sederhana
          if (fileInputRef.current) fileInputRef.current.value = ""; 
          return;
        }
        
        // setSheetsStatus("✅ File berhasil diproses. Memeriksa data di Google Sheets...");
        setIsUploadingToSheets(true); // State ini masih dipertahankan untuk UI spesifik upload
        // setSheetsStatus("🔄 Memuat data terbaru dari Google Sheets...") // Pesan UI spesifik upload

        try {
          await loadDataFromSheets(false)
          const currentData = dashboardState.data // Menggunakan dashboardState.data yang sudah ada

          const existingKeys = new Set(
            currentData.map((record) => `${record.NRP || ""}_${record["Tanggal Absensi"] || ""}`),
          )

          const uniqueNewData = newParsedData.filter((record) => {
            const key = `${record.NRP || ""}_${record["Tanggal Absensi"] || ""}`
            return !existingKeys.has(key)
          })

          if (uniqueNewData.length === 0) {
            // setSheetsStatus("⚠️ Semua data sudah ada di spreadsheet (tidak ada data baru)")
            // setTimeout(() => setSheetsStatus(""), 3000)
            alert("Semua data dari file ini sudah ada di spreadsheet.");
            if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input setelah notifikasi
            return
          }

          // setSheetsStatus(`📤 Menambahkan ${uniqueNewData.length} record baru ke Google Sheets...`)
          const response = await fetch("/api/sheets", {
            method: "POST",
            headers: { "Content-Type": "application/json", },
            body: JSON.stringify({ data: uniqueNewData, fileName: file.name, appendMode: true, }),
          })

          if (response.ok) {
            const result = await response.json()
            await loadDataFromSheets(false) // Reload untuk mendapatkan state terbaru
            // setSheetsStatus(`✅ ${result.message} (${uniqueNewData.length} record baru ditambahkan)`)
            alert(`${result.message} (${uniqueNewData.length} record baru ditambahkan)`);
            setDashboardState(prev => ({...prev, fileName: `Google Sheets Data + ${file.name}`}))
          } else {
            // setSheetsStatus("❌ Gagal menambahkan data ke Google Sheets")
             const errorResult = await response.json().catch(() => ({ error: "Gagal menambahkan data ke Google Sheets" }));
            alert(errorResult.error || "Gagal menambahkan data ke Google Sheets");
          }
        } catch (error) {
          console.error("Error uploading to Google Sheets:", error)
          // setSheetsStatus("❌ Terjadi kesalahan saat mengunggah data")
          alert("Terjadi kesalahan saat mengunggah data ke Google Sheets");
        } finally {
          setIsUploadingToSheets(false);
          // setTimeout(() => setSheetsStatus(""), 5000);
          if (fileInputRef.current) fileInputRef.current.value = ""; 
        }
      } catch (uploadError) {
        console.error("Error during file upload process:", uploadError);
        // setSheetsStatus(`❌ Terjadi kesalahan: ${uploadError instanceof Error ? uploadError.message : 'Error tidak diketahui'}`);
        alert(`Error selama proses unggah file: ${uploadError instanceof Error ? uploadError.message : 'Error tidak diketahui'}`);
        setIsUploadingToSheets(false);
        // setTimeout(() => setSheetsStatus(""), 5000);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      }
    },
    [loadDataFromSheets, dashboardState.data],  // Menggunakan dashboardState.data sebagai dependensi
  )

  // Replace mode - completely replace data in sheets
  const handleFileReplace = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // setSheetsStatus(`🔄 Memproses file ${file.name} untuk mengganti data...`);
      try {
        const parsedData = await parseFileData(file); // Menggunakan parseFileData dari utilitas

        if (parsedData.length === 0) {
          // setSheetsStatus("❌ File kosong atau format tidak valid setelah parsing.");
          // setTimeout(() => setSheetsStatus(""), 3000);
           alert("File kosong atau format tidak valid setelah parsing.");
          if (fileReplaceInputRef.current) fileReplaceInputRef.current.value = ""; 
          return;
        }
        
        // setSheetsStatus("✅ File berhasil diproses. Mengganti data di Google Sheets...");
        setIsUploadingToSheets(true);
        // setSheetsStatus("🔄 Mengganti semua data di Google Sheets...")

        try {
          const response = await fetch("/api/sheets", {
            method: "POST",
            headers: { "Content-Type": "application/json", },
            body: JSON.stringify({ data: parsedData, fileName: file.name, appendMode: false, }),
          })

          if (response.ok) {
            const result = await response.json()
            await loadDataFromSheets(false)
            // setSheetsStatus(`✅ ${result.message}`)
            alert(result.message);
            setDashboardState(prev => ({...prev, fileName: file.name}))
          } else {
            // setSheetsStatus("❌ Gagal mengganti data di Google Sheets")
            const errorResult = await response.json().catch(() => ({ error: "Gagal mengganti data di Google Sheets" }));
            alert(errorResult.error || "Gagal mengganti data di Google Sheets");
          }
        } catch (error) {
          console.error("Error uploading to Google Sheets:", error)
          // setSheetsStatus("❌ Terjadi kesalahan saat mengganti data")
          alert("Terjadi kesalahan saat mengganti data di Google Sheets");
        } finally {
          setIsUploadingToSheets(false);
          // setTimeout(() => setSheetsStatus(""), 3000);
          if (fileReplaceInputRef.current) fileReplaceInputRef.current.value = "";
        }
      } catch (uploadError) {
        console.error("Error during file replace process:", uploadError);
        // setSheetsStatus(`❌ Terjadi kesalahan: ${uploadError instanceof Error ? uploadError.message : 'Error tidak diketahui'}`);
        alert(`Error selama proses penggantian file: ${uploadError instanceof Error ? uploadError.message : 'Error tidak diketahui'}`);
        setIsUploadingToSheets(false);
        // setTimeout(() => setSheetsStatus(""), 5000);
        if (fileReplaceInputRef.current) fileReplaceInputRef.current.value = "";
      }
    },
    [loadDataFromSheets], 
  )

  const handleClearData = useCallback(() => {
    if (confirm("Apakah Anda yakin ingin menghapus semua data lokal? Data di Google Sheets tidak akan terpengaruh.")) {
      localStorage.removeItem("tikPolda_data")
      localStorage.removeItem("tikPolda_fileName")
      setDashboardState(prev => ({...prev, data: [], fileName: "", status: prev.data.length > 0 ? 'idle' : prev.status})) 
      setSelectedDate("")
      // setSheetsStatus("🗑️ Data lokal berhasil dihapus")
      // setTimeout(() => setSheetsStatus(""), 3000)
      alert("Data lokal berhasil dihapus.");
    }
  }, [])

  const uploadToSheets = useCallback(async () => {
    if (dashboardState.data.length === 0) return 

    setIsUploadingToSheets(true)
    // setSheetsStatus("📤 Mengunggah data ke Google Sheets...")

    try {
      const response = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({ data: dashboardState.data, fileName: dashboardState.fileName }), 
      })

      if (!response.ok) {
        throw new Error("Failed to upload to Google Sheets")
      }

      const result = await response.json()
      // setSheetsStatus(`✅ ${result.message}`)
      // setTimeout(() => setSheetsStatus(""), 3000)
      alert(result.message);
    } catch (error) {
      console.error("Error uploading to Google Sheets:", error)
      // setSheetsStatus("❌ Gagal mengunggah ke Google Sheets")
      // setTimeout(() => setSheetsStatus(""), 3000)
      alert("Gagal mengunggah ke Google Sheets.");
    } finally {
      setIsUploadingToSheets(false)
    }
  }, [dashboardState.data, dashboardState.fileName]) 

  const handlePageChange = useCallback((page: string) => {
    setFadeClass("opacity-0")
    setTimeout(() => {
      setCurrentPage(page)
      setFadeClass("opacity-100")
    }, 250)
  }, [])

// calculateFeatures, runKMeansBackend, generateAIAnalysis, dan useEffects terkait K-Means telah dipindahkan.

  // Filtered data based on selected date
  // Data untuk filteredData sekarang berasal dari dashboardState.data
  const filteredData = useMemo(() => {
    if (!selectedDate) return dashboardState.data;
    return dashboardState.data.filter((record) => record["Tanggal Absensi"] === selectedDate);
  }, [dashboardState.data, selectedDate]);

  // Search filtered data
  // Data untuk searchFilteredData sekarang berasal dari dashboardState.data
  const searchFilteredData = useMemo(() => {
    if (!searchTerm) return dashboardState.data; // Default ke semua data jika tidak ada searchTerm
    // Jika searchTerm ada, filter dari filteredData (yang sudah difilter berdasarkan tanggal)
    // atau dari dashboardState.data jika tidak ada selectedDate
    const sourceData = selectedDate ? filteredData : dashboardState.data;
    return sourceData.filter((record) =>
      Object.values(record).some((value) => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [dashboardState.data, searchTerm, selectedDate, filteredData]);

  // KPI calculations
  // filteredData sudah menggunakan dashboardState.data secara tidak langsung
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
          {/* Pesan status umum dari dashboardState */}
          {dashboardState.status === 'loading' && !isKmeansLoading && ( // Jangan tampilkan jika K-Means juga loading
            <div className="px-4 py-2">
              <div className="p-3 bg-blue-100 border border-blue-300 text-blue-700 rounded-lg shadow-sm flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <p className="text-sm">Memuat data absensi...</p>
              </div>
            </div>
          )}
          {dashboardState.status === 'error' && dashboardState.error && (
            <div className="px-4 py-2">
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg shadow-sm">
                <p className="text-sm font-semibold">Error Memuat Data:</p>
                <p className="text-sm">{dashboardState.error}</p>
              </div>
            </div>
          )}
          {/* Status spesifik K-Means dan upload masih di sini */}
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
            {currentPage === "beranda" && (() => {
              // Conditional rendering based on dashboardState.status for Beranda
              if (dashboardState.status === 'loading') {
                return (
                  <div className="space-y-6">
                    {/* Skeleton for File Info */}
                    <Skeleton className="h-10 w-full rounded-lg" />
                    {/* Skeleton for Map */}
                    <Skeleton className="h-64 w-full rounded-xl" />
                    {/* Skeleton for DataStats */}
                    <Skeleton className="h-24 w-full rounded-lg" />
                    {/* Skeleton for KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                    </div>
                    {/* Skeleton for Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <Skeleton className="h-80 rounded-lg" />
                      <Skeleton className="h-80 rounded-lg" />
                    </div>
                  </div>
                );
              }

              if (dashboardState.status === 'error') {
                return (
                  <div className="bg-white p-12 rounded-xl shadow-md text-center">
                    <div className="max-w-md mx-auto">
                      <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                      <h3 className="text-xl font-semibold text-red-700 mb-3">Gagal Memuat Data</h3>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        Terjadi kesalahan saat mencoba memuat data absensi. Pesan error: <br />
                        <code className="text-sm bg-red-50 p-1 rounded">{dashboardState.error || "Tidak ada detail error."}</code>
                      </p>
                      <button
                        onClick={() => loadDataFromSheets(true)}
                        className="inline-flex items-center justify-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Coba Lagi
                      </button>
                    </div>
                  </div>
                );
              }

              if (dashboardState.status === 'idle' || (dashboardState.status === 'success' && dashboardState.data.length === 0)) {
                return (
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
                );
              }
              
              // dashboardState.status === 'success' && dashboardState.data.length > 0
              return (
                <div>
                  {/* File Info */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Sumber Data:</strong> {dashboardState.fileName || "Belum ada data"} | <strong>Total Records:</strong>{" "}
                      {dashboardState.data.length}
                    </p>
                  </div>

                  {/* Interactive Map */}
                  <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Peta Sebaran Absensi</h3>
                    {dashboardState.data.length > 0 ? (
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
                  <DataStats data={dashboardState.data} fileName={dashboardState.fileName} />

                  {/* Date Filter - Now a separate component */}
                  <DashboardControls 
                    uniqueDates={uniqueDates}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    isLoading={dashboardState.status === 'loading'}
                  />

                  {/* KPI Cards - Enhanced Design - Now a separate component */}
                  <KpiCardsGrid kpis={kpis} />

                  {/* Charts */}
                  {/* isLoadingFromSheets ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <Skeleton className="h-6 w-48 mb-4" />
                        <div className="flex items-center justify-center h-[300px]">
                          <div className="space-y-3 text-center">
                            <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                            <Skeleton className="h-4 w-24 mx-auto" />
                          </div>
                        </div>
                      </div>
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
                  ) : */ dashboardState.data.length > 0 && ( // Menggunakan dashboardState.data.length sebagai kondisi utama setelah loading/error/idle
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
                  {hourlyChartData.length > 0 && ( // Ini masih bergantung pada filteredData -> kpis -> hourlyChartData
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
                  
                  {/* Pesan "Belum Ada Data" sudah ditangani oleh kondisi 'idle' atau 'success' dengan data kosong di atas */}
                </div>
              );
            })()}

            {currentPage === "klaster" && (
              <ClusterAnalysisView data={dashboardState.data} />
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
