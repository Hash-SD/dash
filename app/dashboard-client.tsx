"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, BarChart3, Users, RefreshCw, Loader2 } from 'lucide-react';
import { DashboardDataProvider } from '@/app/contexts/DashboardDataProvider'; // <- Impor Provider
import BerandaView from '@/components/beranda-view';
import ClusterAnalysisView from '@/components/cluster-analysis-view';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger
} from "@/components/ui/sidebar";

export default function DashboardTIKPolda() {
  const [currentPage, setCurrentPage] = useState("beranda");
  const [data, setData] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDataFromSheets = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch('/api/sheets');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error("Error loading data from Google Sheets:", error);
      setData([]); // Set data to empty or handle error state appropriately
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromSheets();
  }, [loadDataFromSheets]);

  const PageContent = () => {
    if (isLoadingData) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="w-12 h-12 animate-spin"/></div>;
    }
    if (!data || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-xl text-gray-600 mb-4">Tidak ada data untuk ditampilkan.</p>
          <p className="text-md text-gray-500">
            Silakan coba muat ulang data atau pastikan Google Sheet Anda memiliki data.
          </p>
        </div>
      );
    }
    return (
      <DashboardDataProvider data={data}>
        {currentPage === 'beranda' && <BerandaView />}
        {currentPage === 'klaster' && <ClusterAnalysisView />}
      </DashboardDataProvider>
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoadingData(true);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('/api/data', { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Upload failed');
        const result = await response.json();
        setData(result.data);
      } catch (error) {
        console.error("Error uploading file:", error);
      } finally {
        setIsLoadingData(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar className="bg-gray-800 text-white w-64 space-y-6 py-7 px-2 fixed h-full">
          <SidebarHeader className="text-2xl font-semibold text-center">
            Dashboard TIK
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem
                onClick={() => setCurrentPage('beranda')}
                isActive={currentPage === 'beranda'}
                icon={<BarChart3 size={20} />}
              >
                Beranda
              </SidebarMenuItem>
              <SidebarMenuItem
                onClick={() => setCurrentPage('klaster')}
                isActive={currentPage === 'klaster'}
                icon={<Users size={20} />}
              >
                Analisis Klaster
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarTrigger className="lg:hidden" />
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col ml-64"> {/* ml-64 untuk memberi ruang bagi sidebar */}
          <header className="bg-white shadow p-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {currentPage === 'beranda' ? 'Ringkasan Data Presensi' : 'Analisis Klaster Personel'}
            </h2>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".csv,.xlsx,.xls"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                title="Upload Data Excel/CSV"
              >
                <Upload size={20} className="mr-2"/> Upload Data
              </button>
              <button
                onClick={loadDataFromSheets}
                disabled={isLoadingData}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
                title="Muat Ulang Data dari Google Sheets"
              >
                {isLoadingData && currentPage === "beranda" ? <Loader2 size={20} className="mr-2 animate-spin"/> : <RefreshCw size={20} className="mr-2"/>}
                Muat Ulang
              </button>
            </div>
          </header>
          <main className="p-6 flex-1">
            <PageContent />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
