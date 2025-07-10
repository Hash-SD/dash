// File Location: components/cluster-analysis-view.tsx

"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

// Define necessary types
interface AttendanceRecord {
  NRP: string;
  Nama: string;
  Unit: string;
  Status: string;
  "Waktu Absensi": string;
  "Jenis Absensi": string;
  "Akurasi Lokasi": string;
  "Alamat IP": string;
  "ID Perangkat": string;
}

interface ClusterAnalysisViewProps {
  data: AttendanceRecord[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
const CLUSTER_NAMES = ["Disiplin Tinggi", "Disiplin Sedang", "Perlu Pembinaan", "Inkonsisten", "Bermasalah"];

// The main component for the cluster analysis view
export default function ClusterAnalysisView({ data }: ClusterAnalysisViewProps) {
  const [kValue, setKValue] = useState(3);
  const [personnelFeatures, setPersonnelFeatures] = useState<any[]>([]);
  const [clusterLabels, setClusterLabels] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoized feature calculation for efficiency
  const calculatedFeatures = useMemo(() => {
    const masukRecords = data.filter(record => record["Jenis Absensi"] === "Masuk");
    if (masukRecords.length === 0) return [];

    const statsMap: { [key: string]: any } = {};
    masukRecords.forEach(record => {
      if (!statsMap[record.NRP]) {
        statsMap[record.NRP] = { record, totalMasuk: 0, totalTerlambat: 0, waktuMasuk: [], ipSet: new Set() };
      }
      const stats = statsMap[record.NRP];
      stats.totalMasuk++;
      if (record.Status === "Terlambat") stats.totalTerlambat++;
      const waktu = record["Waktu Absensi"];
      if (waktu?.includes(':')) {
        const [h, m] = waktu.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) stats.waktuMasuk.push(h * 60 + m);
      }
    });

    return Object.values(statsMap).map(stats => {
      const avgWaktu = stats.waktuMasuk.length ? stats.waktuMasuk.reduce((a:number, b:number) => a + b, 0) / stats.waktuMasuk.length : 480;
      const tingkatTerlambat = stats.totalMasuk ? (stats.totalTerlambat / stats.totalMasuk) * 100 : 0;
      return {
        ...stats,
        avgArrivalTime: avgWaktu,
        tardinessRate: tingkatTerlambat,
        features: [avgWaktu, tingkatTerlambat, stats.totalTerlambat, stats.ipSet.size].map(v => isNaN(v) ? 0 : v)
      };
    });
  }, [data]);

  // Effect to run K-Means when data or K changes
  useEffect(() => {
    if (calculatedFeatures.length > 0) {
      setIsLoading(true);
      setError(null);
      fetch("/api/kmeans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: calculatedFeatures.map(f => f.features), k: kValue }),
      })
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.error || "API Error") });
        return res.json();
      })
      .then(result => setClusterLabels(result.cluster_labels || []))
      .catch((err: any) => setError(err.message))
      .finally(() => setIsLoading(false));
    }
  }, [calculatedFeatures, kValue]);

  // Memoized data for charts
  const clusteredData = useMemo(() =>
    personnelFeatures.map((pf, index) => ({
      ...pf,
      cluster: clusterLabels[index],
      x: pf.avgArrivalTime,
      y: pf.tardinessRate
  })), [personnelFeatures, clusterLabels]);

  if (data.length === 0) return <div className="text-center p-8 text-gray-500">Silakan unggah data untuk memulai analisis.</div>;
  if (isLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /><p className="ml-4">Menganalisis Klaster...</p></div>;
  if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-lg">Error: {error}</div>;

  return (
    <div className="space-y-8">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <label htmlFor="kValueSelect" className="font-medium text-gray-700 mr-3">Jumlah Klaster (K):</label>
        <select id="kValueSelect" value={kValue} onChange={(e) => setKValue(Number(e.target.value))} className="border-gray-300 rounded-md">
          {[2, 3, 4, 5].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Visualisasi Pola Klaster</h3>
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="Avg Waktu Datang" tickFormatter={(time) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`}/>
            <YAxis type="number" dataKey="y" name="Tingkat Telat" unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {Array.from({ length: kValue }).map((_, i) => (
              <Scatter key={`cluster-${i}`} name={CLUSTER_NAMES[i]} data={clusteredData.filter(p => p.cluster === i)} fill={COLORS[i % COLORS.length]} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Custom Tooltip component for better stability
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded shadow-lg text-sm">
        <p className="font-bold">{data.record?.Nama}</p>
        <p>Unit: {data.record?.Unit}</p>
        <p>Klaster: {CLUSTER_NAMES[data.cluster]}</p>
      </div>
    );
  }
  return null;
};
