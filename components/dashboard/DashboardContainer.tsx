"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, ScatterChart,
  Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Upload, BarChart3, Users, RefreshCw, Loader2, Trash2, ScatterChartIcon as Scatter3D
} from 'lucide-react';
import { DataStats } from '../data-stats'; // Path diperbaiki
// import InteractiveMap from "@/components/ui/InteractiveMap"; // Komentar atau hapus impor langsung
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic'; // Impor dynamic
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

// Tipe Data Utama
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
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
const CLUSTER_NAMES = ["Disiplin Tinggi", "Disiplin Sedang", "Perlu Pembinaan", "Inkonsisten", "Bermasalah"];

// Definisi DynamicInteractiveMap
const DynamicInteractiveMap = dynamic(() => import('@/components/ui/InteractiveMap'), {
  ssr: false,
  loading: () => <p>Memuat peta...</p> // Opsional: tampilkan pesan loading
});

const BerandaView = ({ data }: { data: AttendanceRecord[] }) => {
  const [selectedDate, setSelectedDate] = useState("");
  const uniqueDates = useMemo(() => [...new Set(data.map(d => d["Tanggal Absensi"]).filter(Boolean))], [data]);

  useEffect(() => {
    if (uniqueDates.length > 0 && !selectedDate) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  const filteredData = useMemo(() => {
    if (!selectedDate) return data;
    return data.filter(record => record["Tanggal Absensi"] === selectedDate);
  }, [data, selectedDate]);

  const statusChartData = useMemo(() => {
      const counts = filteredData.reduce((acc, rec) => {
        const status = rec.Status || "Unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as {[key: string]: number});
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <DataStats data={data} />
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <label htmlFor="dateFilter" className="font-medium mr-3">Filter Tanggal:</label>
        <select id="dateFilter" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border-gray-300 rounded-md">
          {uniqueDates.map(date => <option key={date} value={date}>{date}</option>)}
        </select>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peta Sebaran Absensi</h3>
        <DynamicInteractiveMap records={filteredData} selectedDate={selectedDate} />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Distribusi Status Kehadiran</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
              {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ClusterAnalysisView = ({ data }: { data: AttendanceRecord[] }) => {
    const [kValue, setKValue] = useState(3);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clusteredData, setClusteredData] = useState<any[]>([]);

    const runAnalysis = useCallback(async (currentData: any[], k: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/kmeans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ features: currentData.map(d => d.features), k }),
            });
            if (!response.ok) throw new Error("Gagal menjalankan K-Means.");
            const result = await response.json();
            setClusteredData(currentData.map((pf, index) => ({
                ...pf,
                cluster: result.cluster_labels[index],
                x: pf.avgArrivalTime,
                y: pf.tardinessRate
            })));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const features = data.map(record => {
            const waktu = record["Waktu Absensi"];
            let avgWaktu = 480;
            if (waktu?.includes(':')) {
                const [h, m] = waktu.split(':').map(Number);
                if (!isNaN(h) && !isNaN(m)) avgWaktu = h * 60 + m;
            }
            const tingkatTerlambat = record.Status === "Terlambat" ? 100 : 0;
            return {
                record,
                avgArrivalTime: avgWaktu,
                tardinessRate: tingkatTerlambat,
                features: [avgWaktu, tingkatTerlambat]
            };
        });
        
        if(features.length > 0) {
            runAnalysis(features, kValue);
        }
    }, [data, kValue, runAnalysis]);

    if (isLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="w-10 h-10 animate-spin" /><p className="ml-4">Menganalisis Klaster...</p></div>;
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-lg">Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="font-medium mr-3">Jumlah Klaster (K):</label>
                <select value={kValue} onChange={(e) => setKValue(Number(e.target.value))} className="border-gray-300 rounded-md">
                    {[2, 3, 4, 5].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Visualisasi Klaster</h3>
                <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart>
                        <CartesianGrid />
                        <XAxis type="number" dataKey="x" name="Avg Waktu Datang" unit=" menit" />
                        <YAxis type="number" dataKey="y" name="Tingkat Telat" unit="%" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        {Array.from({ length: kValue }).map((_, i) => (
                            <Scatter key={`cluster-${i}`} name={CLUSTER_NAMES[i]} data={clusteredData.filter(p => p.cluster === i)} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Komponen Induk Utama
export default function DashboardTIKPolda() {
  const [currentPage, setCurrentPage] = useState("beranda");
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const showStatus = (message: string, duration = 4000) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), duration);
  };

  const loadDataFromSheets = useCallback(async () => {
    setIsLoading(true);
    showStatus("Memuat data...");
    try {
      // Menggunakan endpoint baru /api/records untuk mengambil semua data
      // Range default (data-absensi) dan limit (jika ada) akan ditangani oleh backend.
      const response = await fetch("/api/records");
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ details: "Unknown error structure" }));
        throw new Error(`Gagal mengambil data dari server: ${response.statusText} - ${errorResult.details || response.statusText}`);
      }
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        setData(result.data);
        setFileName("Google Sheets"); // Mungkin bisa mengambil nama file/sheet dari respons jika backend menyediakannya
        showStatus(result.message || `Berhasil memuat ${result.data.length} baris.`);
      } else {
        showStatus(result.message || "Tidak ada data ditemukan.");
      }
    } catch (error: any) {
      showStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => { loadDataFromSheets(); }, [loadDataFromSheets]);

  const PageContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="w-12 h-12 animate-spin text-blue-600"/></div>;
    }
    if (data.length === 0) {
       return <div className="text-center p-8 text-gray-500">Data tidak ditemukan. Silakan unggah data untuk memulai.</div>;
    }
    switch (currentPage) {
      case "beranda":
        return <BerandaView data={data} />;
      case "klaster":
        return <ClusterAnalysisView data={data} />;
      default:
        return <div>Pilih halaman dari menu.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar className="bg-[#003366] text-white">
          <SidebarHeader className="p-4 flex items-center gap-3">
            <img src="https://cdn-1.timesmedia.co.id/images/2022/03/24/tik-polri.jpg" alt="Logo" className="h-10 w-10"/>
            <h1 className="font-bold text-lg">Dashboard TIK</h1>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {[{ id: "beranda", label: "Beranda", icon: BarChart3 }, { id: "klaster", label: "Analisis Klaster", icon: Scatter3D }].map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton onClick={() => setCurrentPage(item.id)} isActive={currentPage === item.id} className="text-white data-[active=true]:bg-white data-[active=true]:text-[#003366] hover:bg-white/90 hover:text-[#003366]">
                    <item.icon className="w-4 h-4" /> <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <SidebarInset>
          <header className="bg-white shadow-sm h-16 flex items-center px-6">
            <SidebarTrigger className="md:hidden mr-4"/>
            <h2 className="text-xl font-semibold capitalize">{currentPage}</h2>
          </header>
          {statusMessage && <div className="m-4 p-3 bg-blue-100 text-blue-800 rounded-lg">{statusMessage}</div>}
          <main className="p-6 flex-1">
            <PageContent />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
