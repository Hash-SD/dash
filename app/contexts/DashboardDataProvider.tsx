"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';

// Tipe data yang akan kita sediakan
interface DashboardContextProps {
  kpis: any;
  statusChartData: any[];
  unitChartData: any[];
  clusteredData: any[];
  isLoading: boolean;
  error: string | null;
  kValue: number;
  setKValue: (k: number) => void;
}

const DashboardContext = createContext<DashboardContextProps | undefined>(undefined);

// Hook untuk menggunakan context ini dengan mudah
export const useDashboardData = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboardData harus digunakan di dalam DashboardDataProvider");
  }
  return context;
};

// Komponen Provider yang akan melakukan semua pekerjaan berat
export const DashboardDataProvider = ({ children, data }: { children: React.ReactNode, data: any[] }) => {
  const [kValue, setKValue] = useState(3);
  const [clusterLabels, setClusterLabels] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kalkulasi KPI dan data grafik untuk Beranda
  const { kpis, statusChartData, unitChartData } = useMemo(() => {
    const total = data.length;
    const hadir = data.filter(r => r.Status === "Hadir" || r.Status === "Tepat Waktu").length;
    const terlambat = data.filter(r => r.Status === "Terlambat").length;
    const izin = data.filter(r => r.Status === "Izin").length;
    
    const statusData = [
        { name: "Hadir", value: hadir },
        { name: "Terlambat", value: terlambat },
        { name: "Izin", value: izin },
    ].filter(item => item.value > 0);

    const unitData = Object.entries(data.reduce((acc, rec) => {
        const unit = rec.Unit || "Unknown";
        acc[unit] = (acc[unit] || 0) + 1;
        return acc;
    }, {} as {[key: string]: number})).map(([unit, count]) => ({ unit, count }));

    return {
      kpis: { total, hadir, terlambat, izin, hadirRate: total > 0 ? `${((hadir / total) * 100).toFixed(1)}%` : "0%" },
      statusChartData: statusData,
      unitChartData: unitData,
    };
  }, [data]);

  // Kalkulasi fitur untuk K-Means
  const personnelFeatures = useMemo(() => {
    return data.map(record => {
        const waktu = record["Waktu Absensi"];
        let avgWaktu = 480; // default 8 pagi
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
  }, [data]);

  // Menjalankan K-Means saat data atau K berubah
  useEffect(() => {
    if (personnelFeatures.length > 0) {
      setIsLoading(true);
      setError(null);
      fetch("/api/kmeans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: personnelFeatures.map(f => f.features), k: kValue }),
      })
      .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(new Error(err.error || "API Error"))))
      .then(result => setClusterLabels(result.cluster_labels || []))
      .catch((err: any) => setError(err.message))
      .finally(() => setIsLoading(false));
    }
  }, [personnelFeatures, kValue]);

  // Menggabungkan hasil klaster dengan data asli
  const clusteredData = useMemo(() => 
    personnelFeatures.map((pf, index) => ({
      ...pf,
      cluster: clusterLabels[index],
      x: pf.avgArrivalTime,
      y: pf.tardinessRate
  })), [personnelFeatures, clusterLabels]);

  const value = {
    kpis,
    statusChartData,
    unitChartData,
    clusteredData,
    isLoading,
    error,
    kValue,
    setKValue
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
