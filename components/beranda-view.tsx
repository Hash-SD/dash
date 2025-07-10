// Lokasi: components/beranda-view.tsx

"use client";

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Calendar, TrendingUp, FileText } from 'lucide-react';
import InteractiveMap from "@/components/ui/InteractiveMap";

// Tipe data yang dibutuhkan oleh komponen ini
interface AttendanceRecord {
  NRP: string;
  Nama: string;
  Unit: string;
  "Tanggal Absensi": string;
  "Waktu Absensi": string;
  Status: string;
  Latitude: string;
  Longitude: string;
}

interface BerandaViewProps {
  data: AttendanceRecord[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

// Komponen DataStats sederhana untuk di dalam Beranda
const DataStats = ({ data }: { data: AttendanceRecord[] }) => {
  const stats = useMemo(() => ({
    totalRecords: data.length,
    uniquePersonnel: new Set(data.map(r => r.NRP)).size,
    uniqueDates: new Set(data.map(r => r["Tanggal Absensi"])).size,
    uniqueUnits: new Set(data.map(r => r.Unit)).size,
  }), [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard icon={FileText} label="Total Records" value={stats.totalRecords} />
      <StatCard icon={Users} label="Personel" value={stats.uniquePersonnel} />
      <StatCard icon={Calendar} label="Hari Kerja" value={stats.uniqueDates} />
      <StatCard icon={TrendingUp} label="Unit Kerja" value={stats.uniqueUnits} />
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: number }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
    <Icon className="w-8 h-8 text-blue-600" />
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

// Komponen utama untuk tampilan Beranda
export default function BerandaView({ data }: BerandaViewProps) {
  const uniqueDates = useMemo(() => [...new Set(data.map(d => d["Tanggal Absensi"]).filter(Boolean))], [data]);
  const [selectedDate, setSelectedDate] = useState(uniqueDates[0] || "");

  useEffect(() => {
    if (uniqueDates.length > 0 && !selectedDate) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);
  
  const filteredData = useMemo(() => {
    if (!selectedDate) return data;
    return data.filter(record => record["Tanggal Absensi"] === selectedDate);
  }, [data, selectedDate]);

  const kpis = useMemo(() => {
      const total = filteredData.length;
      const hadir = filteredData.filter(r => r.Status === "Hadir" || r.Status === "Tepat Waktu").length;
      const terlambat = filteredData.filter(r => r.Status === "Terlambat").length;
      const izin = filteredData.filter(r => r.Status === "Izin").length;
      return { total, hadir, terlambat, izin, hadirRate: total > 0 ? ((hadir / total) * 100).toFixed(1) : "0" };
  }, [filteredData]);

  const statusChartData = useMemo(() => [
      { name: "Hadir", value: kpis.hadir },
      { name: "Terlambat", value: kpis.terlambat },
      { name: "Izin", value: kpis.izin },
  ].filter(item => item.value > 0), [kpis]);

  const unitChartData = useMemo(() => {
    const counts = filteredData.reduce((acc, rec) => {
      acc[rec.Unit] = (acc[rec.Unit] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});
    return Object.entries(counts).map(([unit, count]) => ({ unit, count }));
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
        <InteractiveMap records={filteredData} selectedDate={selectedDate} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Kehadiran per Unit</h3>
           <ResponsiveContainer width="100%" height={300}>
            <BarChart data={unitChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="unit" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
