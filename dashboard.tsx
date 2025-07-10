"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Upload, BarChart3, Users, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import ClusterAnalysisView from '@/components/cluster-analysis-view';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
// You can add back other page components here as needed.

// Define the core data structure
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
        showStatus("Tidak ada data di Google Sheets.", 5000);
      }
    } catch (error: any) {
      showStatus(`Gagal memuat data: ${error.message}`, 5000);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromSheets();
  }, [loadDataFromSheets]);

  const parseAndUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    showStatus(`Memproses ${file.name}...`);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileData = event.target?.result;
          if (!fileData) throw new Error("Tidak bisa membaca file.");
          const XLSX = require('xlsx');
          const workbook = XLSX.read(fileData, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

          if (jsonData.length === 0) throw new Error("File kosong.");

          showStatus(`Mengunggah ${jsonData.length} baris ke Google Sheets...`);
          const response = await fetch("/api/sheets", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: jsonData, appendMode: true }),
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Gagal mengunggah.");

          showStatus("Sinkronisasi berhasil. Memuat ulang data...", 6000);
          await loadDataFromSheets();
        } catch (err: any) {
           showStatus(`Error: ${err.message}`, 6000);
           setIsLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error: any) {
      showStatus(`Error: ${error.message}`, 6000);
      setIsLoading(false);
    }
  }, [loadDataFromSheets]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      parseAndUpload(e.target.files[0]);
    }
    e.target.value = ''; // Reset file input
  };

  const clearLocalData = () => {
    if(confirm("Anda yakin ingin menghapus data yang tersimpan di browser? Ini tidak akan menghapus data di Google Sheets.")) {
      localStorage.removeItem("tikPolda_data");
      setData([]);
      setFileName("Data Dihapus");
      showStatus("Data lokal berhasil dihapus.");
    }
  };

  const PageContent = () => {
    if (isLoading && data.length === 0) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="w-12 h-12 animate-spin text-blue-600"/></div>
    }
    switch (currentPage) {
      case "beranda":
        return <div>Halaman Beranda</div>; // Ganti dengan komponen Beranda Anda
      case "klaster":
        return <ClusterAnalysisView data={data} />;
      default:
        return <div>Pilih halaman</div>;
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
                  <SidebarMenuButton onClick={() => setCurrentPage(item.id)} isActive={currentPage === item.id} className="data-[active=true]:bg-white data-[active=true]:text-[#003366] hover:bg-white/90 hover:text-[#003366]">
                    <item.icon className="w-4 h-4" /> <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>Manajemen Data</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => loadDataFromSheets()} disabled={isLoading}>
                      {isLoading ? <Loader2 className="animate-spin"/> : <RefreshCw />}<span>Refresh Data</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                      <Upload /><span>Unggah & Tambah</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton onClick={clearLocalData} className="text-red-300 hover:bg-red-600 hover:text-white">
                      <Trash2 /><span>Hapus Data Lokal</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 text-xs">
            <p>Data Source: {fileName}</p>
            <p>Records: {data.length}</p>
          </SidebarFooter>
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
