"use client"

import type React from "react"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import {
  Upload, Search, Trash2, BarChart3, Users, Clock, AlertTriangle, TrendingUp, RefreshCw, Loader2, ScatterChartIcon as Scatter3D
} from "lucide-react"
import { DataStats } from "./components/data-stats"
import InteractiveMap from "@/components/ui/InteractiveMap"
import ClusterAnalysisView from "@/components/cluster-analysis-view" // Impor komponen baru
import 'leaflet/dist/leaflet.css'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger
} from "@/components/ui/sidebar"

// Tipe data ini digunakan oleh beberapa komponen
interface AttendanceRecord {
  NRP: string;
  Nama: string;
  Unit: string;
  "Tanggal Absensi": string;
  "Waktu Absensi": string;
  Status: string;
  "Jenis Absensi": string;
  Latitude: string;
  Longitude: string;
  "Akurasi Lokasi": string;
  "URL Foto": string;
  "ID Perangkat": string;
  Deskripsi: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function DashboardTIKPolda() {
  const [currentPage, setCurrentPage] = useState("beranda");
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sheetsStatus, setSheetsStatus] = useState("");
  const [isLoadingFromSheets, setIsLoadingFromSheets] = useState(false);
  const [isUploadingToSheets, setIsUploadingToSheets] = useState(false);
  const [fadeClass, setFadeClass] = useState("opacity-100");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileReplaceInputRef = useRef<HTMLInputElement>(null);

  const loadDataFromSheets = useCallback(async (showStatus = true) => {
    if (showStatus) {
      setIsLoadingFromSheets(true);
      setSheetsStatus("Memuat data dari Google Sheets...");
    }
    try {
      const response = await fetch("/api/sheets");
      if (!response.ok) throw new Error("Gagal mengambil data dari server.");
      const result = await response.json();
      if (result.data && result.data.length > 0) {
        setData(result.data);
        setFileName("Data dari Google Sheets");
        localStorage.setItem("tikPolda_data", JSON.stringify(result.data));
        if (showStatus) setSheetsStatus(`Berhasil memuat ${result.data.length} baris data.`);
      } else {
        const localData = localStorage.getItem("tikPolda_data");
        if (localData) {
          setData(JSON.parse(localData));
          setFileName("Data dari Penyimpanan Lokal");
          if (showStatus) setSheetsStatus("Gagal memuat dari Sheets, data lokal ditampilkan.");
        } else {
          if (showStatus) setSheetsStatus("Tidak ada data di Google Sheets atau lokal.");
        }
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      if (showStatus) setSheetsStatus(`Gagal memuat data: ${error.message}`);
    } finally {
      if (showStatus) {
        setIsLoadingFromSheets(false);
        setTimeout(() => setSheetsStatus(""), 4000);
      }
    }
  }, []);

  const parseFileData = useCallback(async (file: File): Promise<AttendanceRecord[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const fileData = event.target?.result;
                if (!fileData) return reject(new Error("Gagal membaca data file."));
                const XLSX = require('xlsx');
                const workbook = XLSX.read(fileData, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData as AttendanceRecord[]);
            } catch (err) {
                reject(new Error("Gagal mem-parsing file. Pastikan formatnya benar."));
            }
        };
        reader.onerror = () => reject(new Error("Gagal membaca file."));
        reader.readAsBinaryString(file);
    });
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, replace = false) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const actionText = replace ? "Mengganti" : "Menambahkan";
    setSheetsStatus(`Memproses file ${file.name}...`);
    setIsUploadingToSheets(true);
    try {
        const newParsedData = await parseFileData(file);
        if (newParsedData.length === 0) throw new Error("File kosong atau format tidak dapat dibaca.");
        setSheetsStatus(`${actionText} ${newParsedData.length} data ke Google Sheets...`);
        const response = await fetch("/api/sheets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: newParsedData, appendMode: !replace }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Gagal ${actionText.toLowerCase()} data.`);
        setSheetsStatus(`${result.message || 'Operasi berhasil'}. Memuat ulang data...`);
        await loadDataFromSheets(false);
        setSheetsStatus("Data berhasil disinkronkan dengan Google Sheets.");
    } catch (error: any) {
        setSheetsStatus(`Terjadi kesalahan: ${error.message}`);
    } finally {
        setIsUploadingToSheets(false);
        if (event.target) event.target.value = "";
        setTimeout(() => setSheetsStatus(""), 5000);
    }
  }, [parseFileData, loadDataFromSheets]);

  useEffect(() => { loadDataFromSheets(); }, [loadDataFromSheets]);
  useEffect(() => {
    if (data.length > 0 && !selectedDate) {
      const dates = [...new Set(data.map(d => d["Tanggal Absensi"]).filter(Boolean))];
      if (dates.length > 0) setSelectedDate(dates[0]);
    }
  }, [data, selectedDate]);

  const handlePageChange = useCallback((page: string) => {
    setFadeClass("opacity-0");
    setTimeout(() => {
      setCurrentPage(page);
      setFadeClass("opacity-100");
    }, 250);
  }, []);

  const filteredData = useMemo(() => {
    if (!selectedDate) return data;
    return data.filter(record => record["Tanggal Absensi"] === selectedDate);
  }, [data, selectedDate]);

  const kpis = useMemo(() => {
    const total = filteredData.length;
    const hadir = filteredData.filter(r => r.Status === "Hadir" || r.Status === "Tepat Waktu").length;
    const terlambat = filteredData.filter(r => r.Status === "Terlambat").length;
    return {
      total,
      hadir,
      terlambat,
      hadirRate: total > 0 ? ((hadir / total) * 100).toFixed(1) : "0",
    };
  }, [filteredData]);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar className="w-64 bg-[#003366] text-white">
          <SidebarHeader>
            <div className="flex items-center space-x-3 p-4">
              <img src="https://cdn-1.timesmedia.co.id/images/2022/03/24/tik-polri.jpg" alt="Logo" className="h-12 w-12 object-contain" />
              <h1 className="text-lg font-bold text-white">Dashboard TIK</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {[
                { id: "beranda", label: "Beranda", icon: BarChart3 },
                { id: "klaster", label: "Analisis Klaster", icon: Scatter3D },
              ].map(({ id, label, icon: Icon }) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton onClick={() => handlePageChange(id)} isActive={currentPage === id} className="w-full justify-start data-[active=true]:bg-white data-[active=true]:text-[#003366] hover:bg-white/90 hover:text-[#003366]">
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
             <SidebarGroup>
              <SidebarGroupLabel>Manajemen Data</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                   <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => loadDataFromSheets()} disabled={isLoadingFromSheets || isUploadingToSheets}>
                      {isLoadingFromSheets ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                      <span>Refresh Data</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => fileInputRef.current?.click()} disabled={isUploadingToSheets}>
                      <Upload /> <span>Tambah Data</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => fileReplaceInputRef.current?.click()} disabled={isUploadingToSheets}>
                     <Upload /> <span>Ganti Data</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
           <SidebarFooter className="border-t border-white/20 p-4 text-xs text-white/80">
            <p>Sumber: {fileName || "Belum ada data"}</p>
            <p>Total Baris: {data.length}</p>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 bg-white shadow-sm border-b h-16 flex items-center px-6">
            <SidebarTrigger className="mr-4" />
            <h2 className="text-xl font-semibold text-gray-800 capitalize">{currentPage}</h2>
          </header>

          {sheetsStatus && (
            <div className="m-4 p-3 bg-blue-100 border border-blue-300 text-blue-800 rounded-lg shadow-sm">
              <p>{sheetsStatus}</p>
            </div>
          )}

          <main className={`flex-1 p-6 transition-opacity duration-300 ${fadeClass}`}>
            {currentPage === "beranda" && (
              <div className="space-y-6">
                <DataStats data={data} fileName={fileName} />
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Peta Sebaran Absensi</h3>
                  {data.length > 0 ? (
                    <InteractiveMap records={filteredData} selectedDate={selectedDate} />
                  ) : <p className="text-gray-500">Tidak ada data lokasi.</p>}
                </div>
                {/* Visualisasi data lainnya untuk halaman Beranda */}
              </div>
            )}
            {currentPage === "klaster" && <ClusterAnalysisView data={data} />}
          </main>

          <footer className="bg-gray-100 text-gray-600 h-12 flex items-center justify-center px-6 border-t">
            <p className="text-sm">© 2025 Divisi TIK Kepolisian Daerah</p>
          </footer>
        </SidebarInset>

        <input ref={fileInputRef} type="file" accept=".csv, .xls, .xlsx" onChange={(e) => handleFileUpload(e, false)} className="hidden" />
        <input ref={fileReplaceInputRef} type="file" accept=".csv, .xls, .xlsx" onChange={(e) => handleFileUpload(e, true)} className="hidden" />
      </div>
    </SidebarProvider>
  );
}
