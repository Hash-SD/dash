// Lokasi: components/cluster-analysis-view.tsx

"use client";

import React, { useState, useCallback, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell
} from 'recharts';
import { Loader2, ScatterChartIcon as Scatter3D } from 'lucide-react';

// Definisikan tipe data yang dibutuhkan
interface AttendanceRecord {
  NRP: string;
  Nama: string;
  Unit: string;
  Status: string;
  "Tanggal Absensi": string;
  "Waktu Absensi": string;
  "Jenis Absensi": string;
  "Akurasi Lokasi": string;
  "Alamat IP": string;
  "ID Perangkat": string;
}

interface ClusterPoint {
  x: number;
  y: number;
  cluster: number;
  record: AttendanceRecord;
}

interface ClusterAnalysisViewProps {
  data: AttendanceRecord[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
const CLUSTER_NAMES = ["Disiplin Tinggi", "Disiplin Sedang", "Perlu Pembinaan", "Inkonsisten", "Bermasalah"];

// Komponen utama untuk tampilan analisis klaster
export default function ClusterAnalysisView({ data }: ClusterAnalysisViewProps) {
  const [kValue, setKValue] = useState(3);
  const [personnelFeatures, setPersonnelFeatures] = useState<any[]>([]);
  const [clusterLabels, setClusterLabels] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateFeatures = useCallback((records: AttendanceRecord[]) => {
    const masukRecords = records.filter(record => record["Jenis Absensi"] === "Masuk");
    if (masukRecords.length === 0) return [];

    const statsMap: { [key: string]: any } = {};

    masukRecords.forEach(record => {
      const nrp = record.NRP;
      if (!statsMap[nrp]) {
        statsMap[nrp] = {
          record,
          totalMasuk: 0,
          totalTerlambat: 0,
          waktuMasuk: [],
          akurasiLokasi: [],
          ipSet: new Set(),
          perangkatSet: new Set(),
        };
      }
      const stats = statsMap[nrp];
      stats.totalMasuk++;
      if (record.Status === "Terlambat") stats.totalTerlambat++;

      const waktu = record["Waktu Absensi"];
      if (waktu && typeof waktu === 'string' && waktu.includes(':')) {
          const [h, m] = waktu.split(':').map(Number);
          if (!isNaN(h) && !isNaN(m)) stats.waktuMasuk.push(h * 60 + m);
      }
      if (record["Akurasi Lokasi"] && !isNaN(parseFloat(record["Akurasi Lokasi"]))) {
          stats.akurasiLokasi.push(parseFloat(record["Akurasi Lokasi"]));
      }
      if(record["Alamat IP"]) stats.ipSet.add(record["Alamat IP"]);
      if(record["ID Perangkat"]) stats.perangkatSet.add(record["ID Perangkat"]);
    });

    return Object.values(statsMap).map(stats => {
        const avgWaktu = stats.waktuMasuk.length > 0 ? stats.waktuMasuk.reduce((a:number, b:number) => a + b, 0) / stats.waktuMasuk.length : 480;
        const tingkatTerlambat = stats.totalMasuk > 0 ? (stats.totalTerlambat / stats.totalMasuk) * 100 : 0;

        return {
            ...stats,
            avgArrivalTime: avgWaktu,
            tardinessRate: tingkatTerlambat,
            features: [
                avgWaktu,
                tingkatTerlambat,
                stats.totalTerlambat,
                stats.ipSet.size,
                stats.perangkatSet.size,
            ].map(v => isNaN(v) ? 0 : v)
        };
    });
  }, []);

  const runKMeans = useCallback(async (featuresToCluster: number[][], k: number) => {
    if (featuresToCluster.length < k) {
      setError("Data tidak cukup untuk di-klaster.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/kmeans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: featuresToCluster, k }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gagal menjalankan K-Means.");
      }
      const result = await response.json();
      setClusterLabels(result.cluster_labels || []);
    } catch (err: any) {
      setError(err.message);
      setClusterLabels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      const features = calculateFeatures(data);
      setPersonnelFeatures(features);
      if (features.length > 0) {
        runKMeans(features.map(f => f.features), kValue);
      }
    }
  }, [data, kValue, calculateFeatures, runKMeans]);

  const clusteredData = useMemo(() =>
    personnelFeatures.map((pf, index) => ({
      ...pf,
      cluster: clusterLabels[index],
      x: pf.avgArrivalTime,
      y: pf.tardinessRate
  })), [personnelFeatures, clusterLabels]);

  if (data.length === 0) {
    return <div className="text-center p-8 text-gray-500">Silakan unggah data terlebih dahulu untuk melihat analisis.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <label htmlFor="kValueSelect" className="text-sm font-medium text-gray-700 mr-4">Jumlah Klaster (K):</label>
        <select
          id="kValueSelect"
          value={kValue}
          onChange={(e) => setKValue(Number(e.target.value))}
          disabled={isLoading}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          {[2, 3, 4, 5].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="ml-4">Menjalankan Analisis K-Means...</p>
        </div>
      )}

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      {!isLoading && !error && clusteredData.length > 0 && (
        <>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualisasi Pola Klaster</h3>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="Rata-rata Waktu Kedatangan (menit)" tickFormatter={(time) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`}/>
                <YAxis type="number" dataKey="y" name="Tingkat Keterlambatan" unit="%" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        const point = payload[0].payload as any;
                        return (
                            <div className="bg-white p-3 border rounded shadow-lg">
                                <p className="font-bold">{point.record.Nama}</p>
                                <p>Unit: {point.record.Unit}</p>
                                <p>Klaster: {CLUSTER_NAMES[point.cluster]}</p>
                            </div>
                        );
                    }
                    return null;
                }}/>
                <Legend />
                {Array.from({ length: kValue }).map((_, i) => (
                  <Scatter key={`cluster-${i}`} name={CLUSTER_NAMES[i]} data={clusteredData.filter(p => p.cluster === i)} fill={COLORS[i % COLORS.length]} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
