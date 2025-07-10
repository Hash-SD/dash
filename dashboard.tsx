// Lokasi: dashboard.tsx

"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, BarChart3, Users, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import ClusterAnalysisView from '@/components/cluster-analysis-view';
import BerandaView from './components/beranda-view'; // Impor komponen Beranda
import { 
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, 
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, 
  SidebarMenuItem, SidebarProvider, SidebarTrigger 
} from "@/components/ui/sidebar";

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

export default function DashboardTIKPolda() {
  const [currentPage, setCurrentPage] = useState("beranda");
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (message: string, duration = 4000) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), duration);
  };

  const loadDataFromSheets = useCallback(async () => {
    setIsLoading(true);
    showStatus("Memuat data dari Google Sheets...");
    try {
      const response = await fetch("/api/sheets");
      if (!response.ok) throw new Error("Gagal mengambil data dari server.");
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        setData(result.data);
        setFileName("Google Sheets");
        showStatus(`Berhasil memuat ${result.data.length} baris data.`);
      } else {
        showStatus("Tidak ada data ditemukan.");
      }
    } catch (error: any) {
      showStatus(`Gagal memuat data: ${error.message}`, 5000);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => { loadDataFromSheets(); }, [loadDataFromSheets]);

  const PageContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="w-12 h-12 animate-spin text-blue-600"/></div>
    }
    if (data.length === 0) {
       return <div className="text-center p-8 text-gray-500">Data tidak ditemukan. Silakan unggah data untuk memulai.</div>;
    }
    switch (currentPage) {
      case "beranda":
        return <BerandaView data={data} />; // Panggil komponen BerandaView
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
              {[{ id: "beranda", label: "Beranda", icon: BarChart3 }, { id: "klaster", label: "Analisis Klaster", icon: Users }].map(item => (
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

        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls, .csv"/>
      </div>
    </SidebarProvider>
  );
}
