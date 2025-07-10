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

  // ... fungsi loadDataFromSheets tetap sama ...
  useEffect(() => { loadDataFromSheets() }, []);

  const PageContent = () => {
    if (isLoadingData) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="w-12 h-12 animate-spin"/></div>;
    }
    return (
      <DashboardDataProvider data={data}>
        {currentPage === 'beranda' && <BerandaView />}
        {currentPage === 'klaster' && <ClusterAnalysisView />}
      </DashboardDataProvider>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-100 flex">
        {/* ... JSX Sidebar ... */}
        <SidebarInset>
          {/* ... JSX Header ... */}
          <main className="p-6 flex-1">
            <PageContent />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
