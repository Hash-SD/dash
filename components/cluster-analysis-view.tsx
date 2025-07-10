"use client";

import React from 'react';
import { useDashboardData } from '@/app/contexts/DashboardDataProvider';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
const CLUSTER_NAMES = ["Disiplin Tinggi", "Disiplin Sedang", "Perlu Pembinaan", "Inkonsisten", "Bermasalah"];

export default function ClusterAnalysisView() {
  const { clusteredData, isLoading, error, kValue, setKValue } = useDashboardData(); // <- Ambil data dari context

  if (isLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="w-10 h-10 animate-spin" /></div>;
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
                    {/* ... Konfigurasi ScatterChart tetap sama ... */}
                    {Array.from({ length: kValue }).map((_, i) => (
                        <Scatter key={`cluster-${i}`} name={CLUSTER_NAMES[i]} data={clusteredData.filter(p => p.cluster === i)} fill={COLORS[i % COLORS.length]} />
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
